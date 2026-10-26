import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";

import type { Schemas } from "@steamy/api-client";

import {
  apiError,
  CHILD,
  COUNTRIES,
  courseOrder,
  CREATED_AT,
  DECIDED_AT,
  kitOrder,
  NETWORKS,
  payment,
  REQUEST_ID,
  ZONES,
} from "./fixtures.ts";
import { isScenario, SCENARIOS, type Scenario } from "./scenarios.ts";

// Fausse API de Steamy pour les tests fonctionnels (docs/tests/FIXTURES-FAUSSE-API.md) : un petit serveur HTTP sans
// dépendance, parce que Next.js appelle l'API depuis son serveur. Il parle le contrat de `apps/api/openapi.yaml` pour
// les seuls points d'accès que l'écran sous test utilise.
//
// Le scénario et l'instance voyagent dans le cookie de session : `sessionid=<scénario>.<identifiant>`. Le serveur Next
// relaie ce cookie à chaque appel, le navigateur l'envoie lui-même : un test choisit sa fixture en posant ce cookie,
// et chaque identifiant a son propre état (commande, paiements, statut de la demande) : aucun test ne consomme la
// donnée d'un autre, tous peuvent tourner en parallèle.

const SESSION_COOKIE = "sessionid";
const CSRF_COOKIE = "csrftoken";
/** Le scénario que la connexion donne à la session qu'elle crée (cookie posé par le test avant de se connecter). */
export const SCENARIO_COOKIE = "fx_scenario";

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

type Behaviour = "success" | "failure" | "pending";

type Instance = {
  scenario: Scenario;
  request: Mutable<Schemas["PaymentRequest"]> | null;
  order: Schemas["Order"] | null;
  orders: number;
  address: Schemas["DeliveryAddress"] | null;
  payments: Map<number, { payment: Schemas["Payment"]; behaviour: Behaviour }>;
  /** Incidents à usage unique déjà joués. */
  played: Set<string>;
  calls: Call[];
};

export type Call = { method: string; path: string; body: unknown; status: number; handled: boolean };

const instances = new Map<string, Instance>();

function cookiesOf(request: IncomingMessage): Record<string, string> {
  return Object.fromEntries(
    (request.headers.cookie ?? "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      }),
  );
}

function instanceOf(session: string | undefined): { id: string; instance: Instance } | null {
  if (!session) return null;
  const dot = session.indexOf(".");
  const name = session.slice(0, dot);
  if (dot < 1 || !isScenario(name)) return null;
  const known = instances.get(session);
  if (known) return { id: session, instance: known };
  const scenario: Scenario = SCENARIOS[name];
  const address = scenario.address;
  const instance: Instance = {
    scenario,
    request: scenario.request && structuredClone(scenario.request),
    order: null,
    orders: 0,
    address,
    payments: new Map(),
    played: new Set(),
    calls: [],
  };
  if (scenario.pendingOrder && instance.request) {
    instance.order = instance.request.kind === "kit"
      ? kitOrder("CMD-501", ZONES[0], address ?? { zoneId: 1, recipientName: "Marie Adjovi", city: "Cotonou", district: "Fidjrossè", addressLine: "Rue 12, villa verte" }, scenario.rates)
      : courseOrder("CMD-501", scenario.rates);
  }
  instances.set(session, instance);
  return { id: session, instance };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function send(response: ServerResponse, status: number, body?: unknown, headers: Record<string, string | string[]> = {}) {
  response.writeHead(status, { "Content-Type": "application/json", ...headers });
  response.end(body === undefined ? undefined : JSON.stringify(body));
}

function readBody(request: IncomingMessage): Promise<unknown> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      const text = Buffer.concat(chunks).toString("utf8");
      try {
        resolve(text ? JSON.parse(text) : undefined);
      } catch {
        resolve(undefined);
      }
    });
  });
}

/** Corps des requêtes que la fausse API accepte (champs du contrat, tous facultatifs : le corps n'est pas validé). */
type Body = Partial<
  Schemas["PaymentCreateRequest"] &
    Schemas["DeliveryAddressInputRequest"] &
    Schemas["OrderCreateRequest"] &
    Schemas["PaymentRequestDeclineRequest"]
>;

type Context = {
  instance: Instance;
  match: RegExpMatchArray;
  body: Body;
  url: URL;
  respond: (status: number, body?: unknown, headers?: Record<string, string>) => void;
};

type Handler = (context: Context) => void | Promise<void>;

const SERVER_ERROR = apiError("SERVER_ERROR", "Une erreur est survenue côté serveur.");

function once(instance: Instance, key: string, enabled: boolean | undefined): boolean {
  if (!enabled || instance.played.has(key)) return false;
  instance.played.add(key);
  return true;
}

/** Règle la demande (réglée par le paiement, ou close par un autre onglet). */
function close(instance: Instance, status: Schemas["PaymentRequest"]["status"], order?: Schemas["Order"] | null) {
  const request = instance.request;
  if (!request) return;
  Object.assign(request, {
    status,
    decidedAt: DECIDED_AT,
    pendingOrderReference: null,
    orderReference: status === "paid" ? (order?.reference ?? "CMD-501") : null,
  });
}

function newOrder(instance: Instance, address?: Schemas["DeliveryAddressInputRequest"]): Schemas["OrderCreated"] {
  const { request, scenario } = instance;
  instance.orders += 1;
  const reference = `CMD-501-${instance.orders}`;
  const zone = ZONES.find((candidate) => candidate.id === address?.zoneId) ?? ZONES[0];
  const order =
    request?.kind === "kit" && address
      ? kitOrder(reference, zone, address, scenario.rates)
      : courseOrder(reference, scenario.rates);
  instance.order = order;
  if (request) request.pendingOrderReference = reference;
  return { ...order, guestToken: null };
}

function paymentBehaviour(msisdn: string): Behaviour {
  // Comme le faux prestataire de la vraie stack : …01 réussit, …02 échoue, …03 reste en attente
  if (msisdn.endsWith("02")) return "failure";
  if (msisdn.endsWith("03")) return "pending";
  return "success";
}

const routes: { method: string; path: RegExp; auth: boolean; handle: Handler }[] = [];
function route(method: string, path: RegExp, auth: boolean, handle: Handler) {
  routes.push({ method, path, auth, handle });
}

// Public
route("GET", /^\/api\/auth\/csrf\/$/, false, ({ respond }) => {
  const token = randomUUID();
  respond(200, { csrfToken: token }, { "Set-Cookie": `${CSRF_COOKIE}=${token}; Path=/` });
});
route("GET", /^\/api\/referentials\/countries\/$/, false, ({ respond }) => respond(200, COUNTRIES));
route("GET", /^\/api\/referentials\/payment-networks\/$/, false, ({ instance, url, respond }) => {
  if (instance?.scenario.faults.networksError) return respond(500, SERVER_ERROR);
  respond(200, NETWORKS.filter((network) => network.country === url.searchParams.get("country")));
});
route("GET", /^\/api\/shop\/delivery-zones\/$/, false, ({ url, respond }) =>
  respond(200, ZONES.filter((zone) => zone.country === url.searchParams.get("country"))),
);

// Compte
route("GET", /^\/api\/accounts\/me\/$/, true, ({ instance, respond }) => respond(200, instance.scenario.me));
route("GET", /^\/api\/accounts\/me\/parent-profile\/$/, true, ({ instance, respond }) =>
  respond(200, instance.scenario.profile),
);
route("GET", /^\/api\/accounts\/me\/delivery-address\/$/, true, ({ instance, respond }) =>
  instance.address ? respond(200, instance.address) : respond(404, apiError("NOT_FOUND", "Aucune adresse enregistrée.")),
);
route("PUT", /^\/api\/accounts\/me\/delivery-address\/$/, true, ({ instance, body, respond }) => {
  const zone = ZONES.find((candidate) => candidate.id === body.zoneId) ?? ZONES[0];
  instance.address = { ...(body as Schemas["DeliveryAddressInputRequest"]), zone };
  respond(200, instance.address);
});
route("GET", /^\/api\/accounts\/children\/(\d+)\/$/, true, ({ match, respond }) =>
  Number(match[1]) === CHILD.id ? respond(200, CHILD) : respond(404, apiError("NOT_FOUND", "Introuvable.")),
);
route("GET", /^\/api\/notifications\/unread-count\/$/, true, ({ respond }) => respond(200, { count: 0 }));
route("GET", /^\/api\/catalog\/courses\/([\w-]+)\/$/, true, ({ instance, respond }) =>
  respond(200, instance.scenario.course),
);

// Demande de paiement
route("GET", /^\/api\/payments\/payment-requests\/(\d+)\/$/, true, async ({ instance, match, respond }) => {
  const { faults } = instance.scenario;
  if (faults.readDelayMs) await sleep(faults.readDelayMs);
  if (faults.readServerError) return respond(500, SERVER_ERROR);
  if (!instance.request || Number(match[1]) !== REQUEST_ID) {
    return respond(404, apiError("NOT_FOUND", "Demande introuvable."));
  }
  respond(200, instance.request);
});
route("POST", /^\/api\/payments\/payment-requests\/(\d+)\/decline\/$/, true, ({ instance, body, respond }) => {
  const { faults } = instance.scenario;
  if (faults.declineServerError) return respond(500, SERVER_ERROR);
  if (!instance.request) return respond(404, apiError("NOT_FOUND", "Demande introuvable."));
  if (faults.declineClosed || instance.request.status !== "pending") {
    close(instance, "cancelled");
    return respond(409, apiError("PAYMENT_REQUEST_CLOSED", "Cette demande n'est plus en attente."));
  }
  close(instance, "declined");
  instance.request.declineReason = String(body?.reason ?? "");
  respond(200, instance.request);
});

// Commande et paiement
route("POST", /^\/api\/payments\/orders\/$/, true, ({ instance, body, respond }) => {
  const { faults } = instance.scenario;
  if (!instance.request || instance.request.status !== "pending") {
    return respond(409, apiError("PAYMENT_REQUEST_CLOSED", "Cette demande n'est plus en attente."));
  }
  if (once(instance, "request-closed", faults.requestClosedOnOrder)) {
    close(instance, "paid");
    return respond(409, apiError("PAYMENT_REQUEST_CLOSED", "Cette demande n'est plus en attente."));
  }
  if (faults.outOfStock) return respond(409, apiError("OUT_OF_STOCK", "Ce kit n'est plus disponible."));
  if (faults.zoneUnavailable) {
    return respond(400, apiError("DELIVERY_ZONE_UNAVAILABLE", "Cette zone n'est plus desservie."));
  }
  respond(201, newOrder(instance, body?.deliveryAddress));
});
route("GET", /^\/api\/payments\/orders\/([\w-]+)\/$/, true, ({ instance, match, respond }) =>
  instance.order?.reference === match[1] ? respond(200, instance.order) : respond(404, apiError("NOT_FOUND", "Introuvable.")),
);
route("POST", /^\/api\/payments\/orders\/([\w-]+)\/payments\/$/, true, ({ instance, body, respond }) => {
  const { faults } = instance.scenario;
  const order = instance.order;
  if (faults.paymentServerError) return respond(500, SERVER_ERROR);
  if (faults.throttled) {
    return respond(429, apiError("THROTTLED", "Trop de tentatives."), { "Retry-After": String(faults.throttled) });
  }
  if (faults.paymentInProgress) return respond(409, apiError("PAYMENT_IN_PROGRESS", "Un paiement est en cours."));
  if (faults.requestClosedOnPay) {
    close(instance, "declined");
    return respond(409, apiError("PAYMENT_REQUEST_CLOSED", "Cette demande n'est plus en attente."));
  }
  if (once(instance, "order-expired", faults.orderExpiredOnPay)) {
    instance.order = null;
    if (instance.request) instance.request.pendingOrderReference = null;
    return respond(410, apiError("ORDER_EXPIRED", "Cette commande a expiré."));
  }
  if (once(instance, "order-paid", faults.orderAlreadyPaidOnPay)) {
    close(instance, "paid", order);
    return respond(409, apiError("ORDER_ALREADY_PAID", "Cette commande est déjà payée."));
  }
  if (!order) return respond(404, apiError("NOT_FOUND", "Introuvable."));
  const id = 9000 + instance.payments.size + 1;
  const created = payment(id, order, "pending", body as Schemas["PaymentCreateRequest"]);
  instance.payments.set(id, { payment: created, behaviour: paymentBehaviour(String(body?.msisdn ?? "")) });
  respond(201, created);
});
route("GET", /^\/api\/payments\/payments\/(\d+)\/$/, true, ({ instance, match, respond }) => {
  const entry = instance.payments.get(Number(match[1]));
  if (!entry) return respond(404, apiError("NOT_FOUND", "Introuvable."));
  const { faults } = instance.scenario;
  // L'issue arrive à la première interrogation, comme le webhook du prestataire (S9)
  if (entry.behaviour === "success" && entry.payment.status === "pending") {
    entry.payment = { ...entry.payment, status: "succeeded", confirmedAt: CREATED_AT };
    const order = instance.order;
    if (order) {
      instance.order = { ...order, status: faults.latePayment ? "refunded" : "paid", paidAt: CREATED_AT };
      close(instance, "paid", order);
    }
  } else if (entry.behaviour === "failure" && entry.payment.status === "pending") {
    entry.payment = {
      ...entry.payment,
      status: "failed",
      failureCode: faults.neutralFailure ? "AMOUNT_MISMATCH" : "DECLINED",
      failureReason: "Solde insuffisant.",
    };
  }
  respond(200, entry.payment);
});

/** Journal des appels d'une instance, pour les assertions « aucun appel » et « un seul appel » des tests. */
function calls(url: URL, respond: Context["respond"]) {
  const known = instances.get(url.searchParams.get("session") ?? "");
  respond(200, known?.calls ?? []);
}

const CORS = (origin: string) => ({
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Headers": "Content-Type, X-CSRFToken",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Expose-Headers": "Retry-After",
  Vary: "Origin",
});

export function start(port: number) {
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://fausse-api");
    const origin = request.headers.origin;
    const cors = origin ? CORS(origin) : {};
    const method = request.method ?? "GET";
    if (method === "OPTIONS") return send(response, 204, undefined, cors);

    if (url.pathname === "/__fx/health") return send(response, 200, { ok: true });
    if (url.pathname === "/__fx/calls") return calls(url, (status, body) => send(response, status, body, cors));

    const cookies = cookiesOf(request);
    const session = cookies[SESSION_COOKIE];
    const found = instanceOf(session);
    const body = (method === "GET" ? undefined : await readBody(request)) as Body;
    let status = 0;
    const respond: Context["respond"] = (code, payload, headers = {}) => {
      status = code;
      send(response, code, payload, { ...cors, ...headers });
    };

    const handler = routes.find((candidate) => candidate.method === method && candidate.path.test(url.pathname));
    const record = (handled: boolean) => found?.instance.calls.push({ method, path: url.pathname + url.search, body, status, handled });

    // Connexion : crée une session du scénario annoncé par le cookie `fx_scenario`
    if (method === "POST" && url.pathname === "/api/auth/login/") {
      const name = cookies[SCENARIO_COOKIE] ?? "";
      if (!isScenario(name)) return respond(400, apiError("INVALID_CREDENTIALS", "Scénario inconnu."));
      const token = randomUUID();
      return respond(200, { user: SCENARIOS[name].me, csrfToken: token }, {
        "Set-Cookie": `${SESSION_COOKIE}=${name}.${randomUUID()}; Path=/; HttpOnly`,
      });
    }

    if (!handler) {
      respond(404, apiError("NOT_FOUND", `Point d'accès absent de la fausse API : ${method} ${url.pathname}`));
      record(false);
      return;
    }
    const authenticated = handler.auth;
    if (authenticated) {
      if (!found) {
        respond(401, apiError("NOT_AUTHENTICATED", "Non connecté."));
        return;
      }
      // CSRF : toute requête qui modifie des données doit porter le jeton du cookie (comme Django)
      if (!["GET", "HEAD"].includes(method) && (!cookies[CSRF_COOKIE] || request.headers["x-csrftoken"] !== cookies[CSRF_COOKIE])) {
        respond(403, apiError("PERMISSION_DENIED", "CSRF Failed: jeton absent ou incorrect."));
        record(true);
        return;
      }
    }
    const placeholder = { scenario: SCENARIOS["parcours-en-attente"] } as Instance;
    const match = handler.path.exec(url.pathname) as RegExpMatchArray;
    await handler.handle({ instance: found?.instance ?? placeholder, match, body, url, respond });
    record(true);
  });
  return new Promise<typeof server>((resolve) => server.listen(port, () => resolve(server)));
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const port = Number(process.env.FAUSSE_API_PORT ?? 4010);
  void start(port).then(() => console.log(`Fausse API sur http://127.0.0.1:${port}`));
}
