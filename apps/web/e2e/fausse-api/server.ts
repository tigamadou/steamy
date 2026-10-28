import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import type { Schemas } from "@steamy/api-client";

import { fail, newInstance, once, route, routes, type Body, type Call, type Context, type Instance, type Respond } from "./contexte.ts";
import "./ecrans/achat-kits.ts";
import "./ecrans/boutique.ts";
import "./ecrans/commandes.ts";
import "./ecrans/commandes-parent.ts";
import "./ecrans/demande-paiement.ts";
import { resolve } from "./ecrans/paiement.ts";
import { CHILD, COUNTRIES, NETWORKS, ZONES } from "./fixtures.ts";
import { BASE, isScenario, SCENARIOS } from "./scenarios.ts";

export type { Call } from "./contexte.ts";

// Fausse API de Steamy pour les tests fonctionnels (docs/tests/FIXTURES-FAUSSE-API.md) : un petit serveur HTTP sans
// dépendance, parce que Next.js appelle l'API depuis son serveur. Il parle le contrat de `apps/api/openapi.yaml`.
//
// Ce fichier est l'ossature : session, CSRF, CORS, journal des appels, connexion, référentiels et compte. Les routes
// et les fixtures de chaque écran sont dans `ecrans/<écran>.ts`.
//
// Le scénario et l'instance voyagent dans le cookie de session : `sessionid=<scénario>.<identifiant>`. Le serveur Next
// relaie ce cookie à chaque appel, le navigateur l'envoie lui-même : un test choisit sa fixture en posant ce cookie,
// et chaque identifiant a son propre état (commande, paiements, statut de la demande) : aucun test ne consomme la
// donnée d'un autre, tous peuvent tourner en parallèle.

const SESSION_COOKIE = "sessionid";
const CSRF_COOKIE = "csrftoken";
/** Le scénario que la connexion donne à la session qu'elle crée (cookie posé par le test avant de se connecter). */
export const SCENARIO_COOKIE = "fx_scenario";

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
  const instance = newInstance(SCENARIOS[name]);
  instances.set(session, instance);
  return { id: session, instance };
}

function send(response: ServerResponse, status: number, body?: unknown, headers: Record<string, string | string[]> = {}) {
  response.writeHead(status, { "Content-Type": "application/json", ...headers });
  response.end(body === undefined ? undefined : Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

function readBody(request: IncomingMessage): Promise<unknown> {
  return new Promise((resolveBody) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      const text = Buffer.concat(chunks).toString("utf8");
      try {
        resolveBody(text ? JSON.parse(text) : undefined);
      } catch {
        resolveBody(undefined);
      }
    });
  });
}

// Public
route("GET", /^\/api\/auth\/csrf\/$/, false, ({ respond }) => {
  const token = randomUUID();
  respond(200, { csrfToken: token }, { "Set-Cookie": `${CSRF_COOKIE}=${token}; Path=/` });
});
route("GET", /^\/api\/referentials\/countries\/$/, false, ({ respond }) => respond(200, COUNTRIES));
route("GET", /^\/api\/referentials\/payment-networks\/$/, false, ({ instance, url, respond }) => {
  if (instance && once(instance, "networks-error", instance.scenario.faults.networksError)) {
    return respond(500, { code: "SERVER_ERROR", message: "Une erreur est survenue côté serveur." });
  }
  respond(200, NETWORKS.filter((network) => network.country === url.searchParams.get("country")));
});
route("GET", /^\/api\/shop\/delivery-zones\/$/, false, ({ instance, url, respond }) => {
  if (once(instance, "zones-error", instance.scenario.faults.zonesError)) {
    return respond(500, { code: "SERVER_ERROR", message: "Une erreur est survenue côté serveur." });
  }
  // Sans pays, toutes les zones (le panier vide annonce les délais de la boutique)
  const country = url.searchParams.get("country");
  respond(200, ZONES.filter((zone) => !country || zone.country === country));
});

// Compte
route("GET", /^\/api\/accounts\/me\/$/, true, ({ instance, respond }) => respond(200, instance.scenario.me));
route("GET", /^\/api\/accounts\/me\/parent-profile\/$/, true, ({ instance, respond }) =>
  respond(200, instance.scenario.profile),
);
route("GET", /^\/api\/accounts\/me\/delivery-address\/$/, true, ({ instance, respond }) =>
  instance.address ? respond(200, instance.address) : fail(respond, "NOT_FOUND", "Aucune adresse enregistrée."),
);
route("PUT", /^\/api\/accounts\/me\/delivery-address\/$/, true, ({ instance, body, respond }) => {
  const zone = ZONES.find((candidate) => candidate.id === body.zoneId) ?? ZONES[0];
  instance.address = { ...(body as Schemas["DeliveryAddressInputRequest"]), zone };
  respond(200, instance.address);
});
route("GET", /^\/api\/accounts\/children\/(\d+)\/$/, true, ({ match, respond }) =>
  Number(match[1]) === CHILD.id ? respond(200, CHILD) : fail(respond, "NOT_FOUND", "Introuvable."),
);
route("GET", /^\/api\/notifications\/unread-count\/$/, true, ({ respond }) => respond(200, { count: 0 }));

/** Journal des appels d'une instance, pour les assertions « aucun appel » et « un seul appel » des tests. */
function calls(url: URL, respond: Respond) {
  const known = instances.get(url.searchParams.get("session") ?? "");
  respond(200, known?.calls ?? []);
}

/** Webhook du prestataire simulé : règle le dernier paiement en attente de la session (`outcome=success|failure`). */
function settle(url: URL, respond: Respond) {
  const known = instances.get(url.searchParams.get("session") ?? "");
  const entries = [...(known?.payments.values() ?? [])];
  const entry = entries.findLast((candidate) => candidate.payment.status === "pending");
  if (!known || !entry) return fail(respond, "NOT_FOUND", "Aucun paiement en attente.");
  entry.behaviour = url.searchParams.get("outcome") === "failure" ? "failure" : "success";
  resolve(known, entry);
  respond(200, entry.payment);
}

const CORS = (origin: string) => ({
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Headers": "Content-Type, X-CSRFToken, X-Guest-Token",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Expose-Headers": "Retry-After, Content-Disposition",
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
    if (url.pathname === "/__fx/settle") return settle(url, (status, body) => send(response, status, body, cors));

    const cookies = cookiesOf(request);
    const session = cookies[SESSION_COOKIE];
    const found = instanceOf(session);
    const body = (method === "GET" ? undefined : await readBody(request)) as Body;
    let status = 0;
    const respond: Respond = (code, payload, headers = {}) => {
      status = code;
      send(response, code, payload, { ...cors, ...headers });
    };

    const handler = routes.find((candidate) => candidate.method === method && candidate.path.test(url.pathname));
    const record = (handled: boolean) => found?.instance.calls.push({ method, path: url.pathname + url.search, body, status, handled } satisfies Call);

    // Connexion : crée une session du scénario annoncé par le cookie `fx_scenario`
    if (method === "POST" && url.pathname === "/api/auth/login/") {
      const name = cookies[SCENARIO_COOKIE] ?? "";
      if (!isScenario(name) || !SCENARIOS[name].me) return fail(respond, "INVALID_CREDENTIALS", "Scénario inconnu.");
      const token = randomUUID();
      return respond(200, { user: SCENARIOS[name].me, csrfToken: token }, {
        "Set-Cookie": `${SESSION_COOKIE}=${name}.${randomUUID()}; Path=/; HttpOnly`,
      });
    }

    if (!handler) {
      fail(respond, "NOT_FOUND", `Point d'accès absent de la fausse API : ${method} ${url.pathname}`);
      record(false);
      return;
    }
    // Session exigée (401 sinon) ; ouvert à l'invité, la session n'est exigée que si un compte est connecté
    const signedIn = !!found?.instance.scenario.me;
    if (handler.auth === true && !signedIn) return fail(respond, "NOT_AUTHENTICATED", "Non connecté.");
    // CSRF : toute requête qui modifie des données doit porter le jeton du cookie (comme Django)
    if (signedIn && handler.auth && !["GET", "HEAD"].includes(method) && (!cookies[CSRF_COOKIE] || request.headers["x-csrftoken"] !== cookies[CSRF_COOKIE])) {
      fail(respond, "PERMISSION_DENIED", "CSRF Failed: jeton absent ou incorrect.");
      record(true);
      return;
    }
    const placeholder = { scenario: BASE } as Instance;
    const match = handler.path.exec(url.pathname) as RegExpMatchArray;
    const context: Context = { instance: found?.instance ?? placeholder, match, body, url, request, response, respond };
    await handler.handle(context);
    record(true);
  });
  return new Promise<typeof server>((resolveStart) => server.listen(port, () => resolveStart(server)));
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const port = Number(process.env.FAUSSE_API_PORT ?? 4010);
  void start(port).then(() => console.log(`Fausse API sur http://127.0.0.1:${port}`));
}
