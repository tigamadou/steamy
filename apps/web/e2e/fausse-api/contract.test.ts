import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { resolve } from "node:path";

import Ajv, { type ValidateFunction } from "ajv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parse } from "yaml";

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
    for (const [path, openApiPath] of reads) {
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
      ["paiement-demande-close", "PAYMENT_REQUEST_CLOSED"],
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
