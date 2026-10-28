import type { Schemas } from "@steamy/api-client";

import { fail, once, route, type Context, type Instance } from "../contexte.ts";
import { apiError, KITS, taxLines } from "../fixtures.ts";
import { kitOf } from "./commandes.ts";

// Boutique de kits : fiche d'un kit, avec sa disponibilité du moment (le panier de l'invité relit le prix et le stock),
// et panier serveur.

route("GET", /^\/api\/shop\/kits\/([\w-]+)\/$/, false, (context) => {
  const { instance, match, respond } = context;
  if (once(instance, "kit-read-error", instance.scenario.faults.kitReadError)) {
    return respond(500, apiError("SERVER_ERROR", "Une erreur est survenue côté serveur."));
  }
  const kit = kitOf(context, match[1]);
  if (kit) respond(200, kit);
  else fail(respond, "NOT_FOUND", "Kit introuvable.");
});

// Panier serveur (apprenant, parent) : lignes, quantités, sous-total HT et taxes du serveur.

const SERVER_ERROR = apiError("SERVER_ERROR", "Une erreur est survenue côté serveur.");

function cartOf(context: Pick<Context, "instance">): Schemas["Cart"] {
  const { instance } = context;
  const items = instance.cart.flatMap(({ id, kitSlug, quantity }) => {
    const kit = kitOf(context, kitSlug);
    return kit ? [{ id, kit, quantity, total: kit.price * quantity }] : [];
  });
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const taxes = taxLines(subtotal, instance.scenario.rates);
  return {
    items,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal,
    taxes,
    total: subtotal + taxes.reduce((sum, tax) => sum + tax.amount, 0),
  };
}

const writeFails = (instance: Instance) => instance.scenario.faults.cartWriteError;

route("GET", /^\/api\/shop\/cart\/$/, true, (context) => {
  const { instance, respond } = context;
  if (once(instance, "cart-read-error", instance.scenario.faults.cartReadError)) return respond(500, SERVER_ERROR);
  respond(200, cartOf(context));
});

route("POST", /^\/api\/shop\/cart\/items\/$/, true, (context) => {
  const { instance, body, respond } = context;
  const raw = body as { kitSlug?: string; quantity?: number };
  if (writeFails(instance)) return respond(500, SERVER_ERROR);
  const kit = kitOf(context, raw.kitSlug ?? "");
  if (!kit) return fail(respond, "NOT_FOUND", "Kit introuvable.");
  if (!kit.available || instance.scenario.faults.cartOutOfStock) return fail(respond, "OUT_OF_STOCK");
  const line = instance.cart.find((item) => item.kitSlug === kit.slug);
  if (line) line.quantity += raw.quantity ?? 1;
  else instance.cart.push({ id: Math.max(0, ...instance.cart.map((item) => item.id)) + 1, kitSlug: kit.slug, quantity: raw.quantity ?? 1 });
  respond(201, cartOf(context));
});

route("PATCH", /^\/api\/shop\/cart\/items\/(\d+)\/$/, true, (context) => {
  const { instance, match, body, respond } = context;
  if (writeFails(instance)) return respond(500, SERVER_ERROR);
  const line = instance.cart.find((item) => item.id === Number(match[1]));
  if (!line) return fail(respond, "NOT_FOUND", "Ligne introuvable.");
  line.quantity = (body as { quantity?: number }).quantity ?? line.quantity;
  respond(200, cartOf(context));
});

route("DELETE", /^\/api\/shop\/cart\/items\/(\d+)\/$/, true, (context) => {
  const { instance, match, respond } = context;
  if (writeFails(instance)) return respond(500, SERVER_ERROR);
  instance.cart = instance.cart.filter((item) => item.id !== Number(match[1]));
  respond(200, cartOf(context));
});

// Catalogue (kits et catégories) lu par le serveur Next sans session : la même réponse pour tous les scénarios.

route("GET", /^\/api\/catalog\/categories\/$/, false, ({ respond }) =>
  respond(200, [
    { slug: "electronique", label: "Électronique", color: "#2563EB", icon: "🔌", courseCount: 3 },
    { slug: "energie", label: "Énergie", color: "#F59E0B", icon: "☀️", courseCount: 1 },
  ] satisfies Schemas["Category"][]),
);

route("GET", /^\/api\/shop\/kits\/$/, false, ({ url, respond }) => {
  const category = url.searchParams.get("category");
  const results = Object.values(KITS).filter((kit) => !category || kit.category.slug === category);
  respond(200, { count: results.length, next: null, previous: null, results } satisfies Schemas["PaginatedKitList"]);
});
