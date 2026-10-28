import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { resolve } from "node:path";

import Ajv, { type ValidateFunction } from "ajv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parse } from "yaml";

import { courseOrder, courseRequest, eventOrder, kitOrder, kitRequest, KITS, kitsOrder, payment, ZONES } from "./fixtures.ts";
import { SCENARIOS, type ScenarioName } from "./scenarios.ts";
import { start } from "./server.ts";

// Les fixtures sont typées par `Schemas` (pnpm typecheck) ; ce test les valide EN PLUS contre le schéma JSON de
// `apps/api/openapi.yaml`, et valide ce que la fausse API répond réellement (statut documenté, corps conforme) : une
// fixture qui s'écarte du contrat échoue ici, avant d'avoir faussé un test d'écran.

type Operation = { responses: Record<string, { content?: { "application/json"?: { schema: object } } }> };
type Spec = { paths: Record<string, Record<string, Operation>>; components: object };

const spec = parse(readFileSync(resolve(process.cwd(), "../api/openapi.yaml"), "utf8")) as Spec;

/** OpenAPI 3.0 → JSON Schema : `nullable: true` devient une alternative `null` (le seul écart que le contrat utilise). */
function toJsonSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(toJsonSchema);
  if (typeof node !== "object" || node === null) return node;
  const { nullable, ...rest } = node as Record<string, unknown>;
  const converted = Object.fromEntries(Object.entries(rest).map(([key, value]) => [key, toJsonSchema(value)]));
  if (nullable !== true) return converted;
  const enumValues = converted.enum;
  const base = Array.isArray(enumValues) ? { ...converted, enum: enumValues.filter((value) => value !== null) } : converted;
  return { anyOf: [base, { type: "null" }] };
}

const ajv = new Ajv({ strict: false, validateFormats: false, allErrors: true });
ajv.addSchema({ $id: "contrat", components: toJsonSchema(spec.components) });

const validators = new Map<object, ValidateFunction>();
function validator(schema: object): ValidateFunction {
  let compiled = validators.get(schema);
  if (!compiled) {
    // Les `$ref` du contrat sont relatifs à sa racine (`#/components/…`)
    const rewritten = toJsonSchema(JSON.parse(JSON.stringify(schema).replaceAll('"#/', '"contrat#/')));
    compiled = ajv.compile(rewritten as object);
    validators.set(schema, compiled);
  }
  return compiled;
}

/**
 * Ce qui dépend de cette liste de tolérance tant que l'API ne documente pas ses statuts d'erreur : tous les incidents
 * des scénarios (409 `OUT_OF_STOCK`, `PAYMENT_*`, `ORDER_*`, 410, 402, 500…) et le 404 de `accounts/me/delivery-address/` ;
 * le retrait d'une ligne du panier (`DELETE shop/cart/items/{id}/`) répond 200 avec le panier alors que le contrat annonce 204.
 *
 * Statuts que le contrat ne décrit pas mais que l'API renvoie (409/410/402 métier, 500, et 404 de l'adresse de livraison
 * absente, que le front lit comme « rien d'enregistré ») : seul le corps est contrôlé.
 */
const UNDOCUMENTED_ERRORS = new Set([402, 404, 409, 410, 500]);

let base = "";
let close = () => {};
beforeAll(async () => {
  const server = await start(0);
  base = `http://localhost:${(server.address() as AddressInfo).port}`;
  close = () => server.close();
});
afterAll(() => close());

let counter = 0;
async function call(scenario: ScenarioName, method: string, path: string, body?: object, cookies: string[] = []) {
  const session = `${scenario}.vitest-${++counter}`;
  const csrf = "jeton";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-CSRFToken": csrf,
    Cookie: [`sessionid=${session}`, `csrftoken=${csrf}`, ...cookies].join("; "),
  };
  const response = await fetch(`${base}${path}`, { method, headers, body: body && JSON.stringify(body) });
  const text = await response.text();
  return { session, status: response.status, json: text ? JSON.parse(text) : undefined, headers };
}

function check(openApiPath: string, method: string, status: number, json: unknown) {
  const operation = spec.paths[openApiPath]?.[method.toLowerCase()];
  expect(operation, `${method} ${openApiPath} absent du contrat`).toBeDefined();
  const documented = operation.responses[String(status)]?.content?.["application/json"]?.schema;
  if (!documented) {
    expect(UNDOCUMENTED_ERRORS.has(status), `statut ${status} absent du contrat pour ${method} ${openApiPath}`).toBe(true);
    const errorSchema = { $ref: "#/components/schemas/Error" };
    const valid = validator(errorSchema);
    expect(valid(json), JSON.stringify(valid.errors)).toBe(true);
    return;
  }
  const valid = validator(documented);
  expect(valid(json), JSON.stringify(valid.errors)).toBe(true);
}

describe("boutique et checkout invité : réponses conformes au contrat", () => {
  const cookie = (session: string) => `sessionid=${session}; csrftoken=t`;
  const send = async (session: string, method: string, path: string, body?: object, extra: Record<string, string> = {}) => {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: { "Content-Type": "application/json", "X-CSRFToken": "t", Cookie: cookie(session), ...extra },
      body: body && JSON.stringify(body),
    });
    const text = await response.text();
    return { status: response.status, json: text ? JSON.parse(text) : undefined };
  };
  const kitAddress = { zoneId: 2, recipientName: "Awa Invitée", phone: "+2290197123402", city: "Porto-Novo", district: "Ouando", addressLine: "Près du marché" };

  it("l'invité crée sa commande, la lit avec son jeton, la paie et lit sa facture", async () => {
    const session = "invite-panier.vitest-invite";
    const kit = await send(session, "GET", "/api/shop/kits/pack-electronique/");
    check("/api/shop/kits/{slug}/", "GET", kit.status, kit.json);
    const zones = await send(session, "GET", "/api/shop/delivery-zones/");
    check("/api/shop/delivery-zones/", "GET", zones.status, zones.json);
    const created = await send(session, "POST", "/api/payments/orders/", {
      kind: "kit",
      items: [{ kitSlug: "pack-electronique", quantity: 2 }],
      guest: { firstName: "Awa", lastName: "Invitée", phone: "+2290197123402" },
      deliveryAddress: kitAddress,
    });
    check("/api/payments/orders/", "POST", created.status, created.json);
    expect(created.json.guestToken).toMatch(/^jeton-/);
    const token = { "X-Guest-Token": created.json.guestToken };
    const read = await send(session, "GET", `/api/payments/orders/${created.json.reference}/`, undefined, token);
    check("/api/payments/orders/{reference}/", "GET", read.status, read.json);
    expect((await send(session, "GET", `/api/payments/orders/${created.json.reference}/`)).status).toBe(404);
    const pay = await send(session, "POST", `/api/payments/orders/${created.json.reference}/payments/`, { country: "BJ", network: "mtn", msisdn: "0197123401" }, token);
    check("/api/payments/orders/{reference}/payments/", "POST", pay.status, pay.json);
    const settled = await send(session, "GET", `/api/payments/payments/${pay.json.id}/`, undefined, token);
    check("/api/payments/payments/{id}/", "GET", settled.status, settled.json);
    expect(settled.json.status).toBe("succeeded");
    expect((await send(session, "GET", `/api/payments/payments/${pay.json.id}/`)).status).toBe(404);
  });

  it("commandes de départ : suivi, facture et refus sans jeton", async () => {
    const session = "invite-commande-payee.vitest-suivi";
    const token = { "X-Guest-Token": "jeton-invite-test" };
    const order = await send(session, "GET", "/api/payments/orders/CMD-INV-1/", undefined, token);
    check("/api/payments/orders/{reference}/", "GET", order.status, order.json);
    const invoice = await fetch(`${base}/api/payments/orders/CMD-INV-1/invoice/`, { headers: { Cookie: cookie(session), ...token } });
    expect(invoice.status).toBe(200);
    expect(invoice.headers.get("content-type")).toBe("application/pdf");
    expect(invoice.headers.get("content-disposition")).toContain("facture-FAC-2026-000001.pdf");
    expect((await send(session, "GET", "/api/payments/orders/CMD-INV-1/invoice/")).status).toBe(404);
    const me = await send(session, "GET", "/api/accounts/me/");
    expect(me.status).toBe(401);
  });

  it("commandes du parent : liste filtrée et paginée, suivi, enfants, catalogue", async () => {
    const session = "commandes-nombreuses.vitest-liste";
    const first = await send(session, "GET", "/api/payments/orders/?page=1&pageSize=10");
    check("/api/payments/orders/", "GET", first.status, first.json);
    expect(first.json.results).toHaveLength(10);
    expect(first.json.next).toContain("page=2");
    const second = await send(session, "GET", "/api/payments/orders/?page=2&pageSize=10");
    check("/api/payments/orders/", "GET", second.status, second.json);
    expect(second.json.results).toHaveLength(2);
    expect(second.json.next).toBeNull();
    const family = "commandes-parent.vitest-famille";
    const pending = await send(family, "GET", "/api/payments/orders/?status=pending");
    check("/api/payments/orders/", "GET", pending.status, pending.json);
    expect(pending.json.results.map((order: { reference: string }) => order.reference)).toEqual(["CMD-K2"]);
    const kit = await send(family, "GET", "/api/payments/orders/CMD-K1/");
    check("/api/payments/orders/{reference}/", "GET", kit.status, kit.json);
    expect((await send(family, "GET", "/api/payments/orders/CMD-AUTRE/")).status).toBe(404);
    const children = await send(family, "GET", "/api/accounts/children/");
    check("/api/accounts/children/", "GET", children.status, children.json);
    const kits = await send(family, "GET", "/api/shop/kits/");
    check("/api/shop/kits/", "GET", kits.status, kits.json);
    const categories = await send(family, "GET", "/api/catalog/categories/");
    check("/api/catalog/categories/", "GET", categories.status, categories.json);
  });

  it("achat de kits du parent : commande payée avec facture et Kit Codes", async () => {
    const session = "achat-adresse-enregistree.vitest-achat";
    const created = await send(session, "POST", "/api/payments/orders/", { kind: "kit", items: [{ kitSlug: "pack-electronique", quantity: 2 }], deliveryAddress: kitAddress, beneficiaryId: 21 });
    check("/api/payments/orders/", "POST", created.status, created.json);
    expect(created.json.guestToken).toBeNull();
    const pay = await send(session, "POST", `/api/payments/orders/${created.json.reference}/payments/`, { country: "BJ", network: "mtn", msisdn: "0197000001" });
    await send(session, "GET", `/api/payments/payments/${pay.json.id}/`);
    const paid = await send(session, "GET", `/api/payments/orders/${created.json.reference}/`);
    check("/api/payments/orders/{reference}/", "GET", paid.status, paid.json);
    expect(paid.json.status).toBe("paid");
    expect(paid.json.kitCodes).toHaveLength(2);
    expect(paid.json.invoice).toEqual({ number: "FAC-2026-900001", pdfStatus: "pending" });
  });

  it("panier serveur : lecture, ajout, quantité, retrait", async () => {
    const session = "parcours-en-attente.vitest-panier";
    const empty = await send(session, "GET", "/api/shop/cart/");
    check("/api/shop/cart/", "GET", empty.status, empty.json);
    const added = await send(session, "POST", "/api/shop/cart/items/", { kitSlug: "pack-electronique", quantity: 2 });
    check("/api/shop/cart/items/", "POST", added.status, added.json);
    expect(added.json.items[0].total).toBe(44000);
    expect(added.json.taxes.map((tax: { code: string }) => tax.code)).toEqual(["vat", "aib"]);
    const id = added.json.items[0].id;
    const changed = await send(session, "PATCH", `/api/shop/cart/items/${id}/`, { quantity: 3 });
    check("/api/shop/cart/items/{id}/", "PATCH", changed.status, changed.json);
    const removed = await send(session, "DELETE", `/api/shop/cart/items/${id}/`);
    // Le contrat annonce 204 ; l'API renvoie le panier (200), que le front relit comme tel
    expect(removed.status).toBe(200);
    expect(validator({ $ref: "#/components/schemas/Cart" })(removed.json)).toBe(true);
    const soldOut = await send("invite-kit-indisponible.vitest-panier", "GET", "/api/shop/kits/pack-electronique/");
    expect(soldOut.json.available).toBe(false);
  });
});

describe("les objets par défaut respectent le contrat OpenAPI", () => {
  const schema = (name: string) => ({ $ref: `#/components/schemas/${name}` });
  const defaults: [string, string, unknown][] = [
    ["PaymentRequest", "demande de parcours", courseRequest()],
    ["PaymentRequest", "demande de kit", kitRequest()],
    ["PaymentRequest", "demande sans taxes", courseRequest({}, { vat: null, aib: null })],
    ["Order", "commande de parcours", courseOrder("CMD-1")],
    ["Order", "commande de kits", kitsOrder("CMD-3", [{ kit: KITS["pack-electronique"], quantity: 2 }, { kit: KITS["steamy-bot-v1"], quantity: 1 }], ZONES[1], { zoneId: 2, recipientName: "A", city: "B", district: "C", addressLine: "D" })],
    ["Order", "commande d'événement", eventOrder("CMD-4")],
    ["Order", "commande de kit", kitOrder("CMD-2", ZONES[0], { zoneId: 1, recipientName: "A", city: "B", district: "C", addressLine: "D" })],
    ["Payment", "paiement", payment(1, courseOrder("CMD-1"), "pending", { country: "BJ", network: "mtn", msisdn: "0197000001" })],
  ];
  it.each(defaults)("%s : %s", (name, _label, value) => {
    const valid = validator(schema(name));
    expect(valid(value), JSON.stringify(valid.errors)).toBe(true);
  });
});

const address = { zoneId: 1, recipientName: "Marie Adjovi", city: "Cotonou", district: "Akpakpa", addressLine: "Rue 5" };

describe("la fausse API répond selon le contrat OpenAPI", () => {
  it.each(Object.keys(SCENARIOS) as ScenarioName[])("scénario %s : lectures de l'écran", async (scenario) => {
    const reads: [string, string][] = [
      ["/api/accounts/me/", "/api/accounts/me/"],
      ["/api/accounts/me/parent-profile/", "/api/accounts/me/parent-profile/"],
      ["/api/accounts/me/delivery-address/", "/api/accounts/me/delivery-address/"],
      ["/api/accounts/children/21/", "/api/accounts/children/{id}/"],
      ["/api/catalog/courses/capteurs-electroniques/", "/api/catalog/courses/{slug}/"],
      ["/api/payments/payment-requests/501/", "/api/payments/payment-requests/{id}/"],
      ["/api/payments/payment-requests/999/", "/api/payments/payment-requests/{id}/"],
      ["/api/referentials/countries/", "/api/referentials/countries/"],
      ["/api/referentials/payment-networks/?country=BJ", "/api/referentials/payment-networks/"],
      ["/api/shop/delivery-zones/?country=BJ", "/api/shop/delivery-zones/"],
      ["/api/auth/csrf/", "/api/auth/csrf/"],
    ];
    // Un visiteur sans compte (invité) ne lit que les points d'accès publics
    const isPublic = (path: string) => /referentials|delivery-zones|auth\/csrf/.test(path);
    for (const [path, openApiPath] of reads.filter(([path]) => SCENARIOS[scenario].me || isPublic(path))) {
      const { status, json } = await call(scenario, "GET", path);
      check(openApiPath, "GET", status, json);
    }
  }, 15_000);

  it("commande d'un kit, paiement, lecture du paiement et de la commande", async () => {
    const session = "kit-adresse-a-saisir.vitest-flux";
    const fetchJson = async (method: string, path: string, body?: object) => {
      const response = await fetch(`${base}${path}`, {
        method,
        headers: { "Content-Type": "application/json", "X-CSRFToken": "t", Cookie: `sessionid=${session}; csrftoken=t` },
        body: body && JSON.stringify(body),
      });
      return { status: response.status, json: await response.json() };
    };
    const order = await fetchJson("POST", "/api/payments/orders/", { paymentRequestId: 501, deliveryAddress: address });
    check("/api/payments/orders/", "POST", order.status, order.json);
    const pay = await fetchJson("POST", `/api/payments/orders/${order.json.reference}/payments/`, {
      country: "BJ",
      network: "mtn",
      msisdn: "0197000001",
    });
    check("/api/payments/orders/{reference}/payments/", "POST", pay.status, pay.json);
    const settled = await fetchJson("GET", `/api/payments/payments/${pay.json.id}/`);
    check("/api/payments/payments/{id}/", "GET", settled.status, settled.json);
    expect(settled.json.status).toBe("succeeded");
    const fresh = await fetchJson("GET", `/api/payments/orders/${order.json.reference}/`);
    check("/api/payments/orders/{reference}/", "GET", fresh.status, fresh.json);
    const saved = await fetchJson("PUT", "/api/accounts/me/delivery-address/", address);
    check("/api/accounts/me/delivery-address/", "PUT", saved.status, saved.json);
    const failed = await fetchJson("POST", `/api/payments/orders/${order.json.reference}/payments/`, {
      country: "BJ",
      network: "mtn",
      msisdn: "0197000002",
    });
    const refused = await fetchJson("GET", `/api/payments/payments/${failed.json.id}/`);
    check("/api/payments/payments/{id}/", "GET", refused.status, refused.json);
    expect(refused.json.status).toBe("failed");
  });

  it("refus de la demande", async () => {
    const { status, json } = await call("parcours-en-attente", "POST", "/api/payments/payment-requests/501/decline/", {
      reason: "Plus tard.",
    });
    check("/api/payments/payment-requests/{id}/decline/", "POST", status, json);
    expect(json.status).toBe("declined");
  });

  it("incidents du paiement : corps d'erreur du contrat", async () => {
    const scenarios: [ScenarioName, string][] = [
      ["paiement-erreur-serveur", "SERVER_ERROR"],
      ["paiement-trop-de-tentatives", "THROTTLED"],
      ["paiement-deja-en-cours", "PAYMENT_IN_PROGRESS"],
      ["paiement-demande-close-au-paiement", "PAYMENT_REQUEST_CLOSED"],
      ["kit-reservation-depassee", "ORDER_EXPIRED"],
      ["kit-commande-deja-payee", "ORDER_ALREADY_PAID"],
    ];
    for (const [scenario, code] of scenarios) {
      const order = await call(scenario, "POST", "/api/payments/orders/", { paymentRequestId: 501 });
      const result = await call(scenario, "POST", "/api/payments/orders/CMD-501/payments/", {
        country: "BJ",
        network: "mtn",
        msisdn: "0197000001",
      });
      void order;
      if (result.status === 404) continue;
      expect(result.json.code).toBe(code);
      check("/api/payments/orders/{reference}/payments/", "POST", result.status, result.json);
    }
  });

  it("demande close à la création de la commande, commande impossible, zone indisponible", async () => {
    const closed = await call("paiement-demande-close", "POST", "/api/payments/orders/", { paymentRequestId: 501 });
    expect(closed.json.code).toBe("PAYMENT_REQUEST_CLOSED");
    check("/api/payments/orders/", "POST", closed.status, closed.json);
    const stock = await call("kit-rupture-de-stock", "POST", "/api/payments/orders/", { paymentRequestId: 501, deliveryAddress: address });
    expect(stock.json.code).toBe("OUT_OF_STOCK");
    check("/api/payments/orders/", "POST", stock.status, stock.json);
    const zone = await call("kit-zone-indisponible", "POST", "/api/payments/orders/", { paymentRequestId: 501, deliveryAddress: address });
    expect(zone.json.code).toBe("DELIVERY_ZONE_UNAVAILABLE");
    check("/api/payments/orders/", "POST", zone.status, zone.json);
  });

  it("refus impossible : demande déjà close, erreur serveur", async () => {
    const closed = await call("refus-demande-close", "POST", "/api/payments/payment-requests/501/decline/", { reason: "" });
    expect(closed.json.code).toBe("PAYMENT_REQUEST_CLOSED");
    check("/api/payments/payment-requests/{id}/decline/", "POST", closed.status, closed.json);
    const failed = await call("refus-erreur-serveur", "POST", "/api/payments/payment-requests/501/decline/", { reason: "" });
    expect(failed.json.code).toBe("SERVER_ERROR");
    check("/api/payments/payment-requests/{id}/decline/", "POST", failed.status, failed.json);
  });

  it("webhook simulé : l'issue du paiement en attente est réglée", async () => {
    const session = "parcours-en-attente.vitest-webhook";
    const headers = { "Content-Type": "application/json", "X-CSRFToken": "t", Cookie: `sessionid=${session}; csrftoken=t` };
    const order = await (await fetch(`${base}/api/payments/orders/`, { method: "POST", headers, body: JSON.stringify({ paymentRequestId: 501 }) })).json();
    await fetch(`${base}/api/payments/orders/${order.reference}/payments/`, {
      method: "POST",
      headers,
      body: JSON.stringify({ country: "BJ", network: "mtn", msisdn: "0197000003" }),
    });
    const settled = await fetch(`${base}/__fx/settle?session=${session}&outcome=failure`);
    expect((await settled.json()).status).toBe("failed");
    const none = await fetch(`${base}/__fx/settle?session=${session}&outcome=failure`);
    expect(none.status).toBe(404);
    const journal = await (await fetch(`${base}/__fx/calls?session=${session}`)).json();
    expect(journal.map((entry: { method: string }) => entry.method)).toContain("POST");
  });

  it("refuse une requête qui modifie des données sans jeton CSRF", async () => {
    const response = await fetch(`${base}/api/payments/payment-requests/501/decline/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: "sessionid=parcours-en-attente.sans-jeton" },
      body: JSON.stringify({ reason: "" }),
    });
    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe("PERMISSION_DENIED");
  });
});
