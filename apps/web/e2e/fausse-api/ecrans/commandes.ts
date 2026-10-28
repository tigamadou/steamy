import type { Schemas } from "@steamy/api-client";
import { randomUUID } from "node:crypto";

import { accessOrder, fail, inMinutes, once, putOrder, route, sleep, type Context } from "../contexte.ts";
import { apiError, KITS, kitsOrder, ZONES, type KitLine } from "../fixtures.ts";
import { createOrderOfRequest } from "./demande-paiement.ts";

// Commandes : création (demande de paiement du parent, ou achat de kits par l'invité ou le parent), lecture et facture.
// Les écrans qui les affichent (checkout invité, commandes du parent, achat direct) ne déclarent que leurs scénarios.

const SERVER_ERROR = apiError("SERVER_ERROR", "Une erreur est survenue côté serveur.");

route("POST", /^\/api\/payments\/orders\/$/, "invite", (context) =>
  context.body.paymentRequestId === undefined ? createKitOrder(context) : createOrderOfRequest(context),
);

/** Kit du catalogue tel que ce scénario le vend : en rupture ou retiré selon le scénario. */
export function kitOf(context: Pick<Context, "instance">, slug: string): Schemas["KitDetail"] | null {
  const { soldOut, withdrawn } = context.instance.scenario;
  const known = KITS[slug];
  if (!known || withdrawn.includes(slug)) return null;
  return soldOut.includes(slug) ? { ...known, available: false } : known;
}

/** Achat de kits : lignes du panier, adresse de livraison, invité (nom et téléphone) ou compte connecté. */
function createKitOrder(context: Context) {
  const { instance, body, respond } = context;
  const { faults, rates } = instance.scenario;
  if (faults.orderServerError) return respond(500, SERVER_ERROR);
  const lines: KitLine[] = [];
  for (const item of body.items ?? []) {
    const kit = kitOf(context, item.kitSlug ?? "");
    if (!kit?.available || faults.outOfStock) return fail(respond, "OUT_OF_STOCK", "Ce kit n'est plus disponible.");
    lines.push({ kit, quantity: item.quantity ?? 1 });
  }
  if (faults.zoneUnavailable) return fail(respond, "DELIVERY_ZONE_UNAVAILABLE", "Cette zone n'est plus desservie.");
  if (faults.deliveryAddressRefused) {
    return respond(400, {
      code: "VALIDATION_ERROR",
      message: "Données invalides.",
      fields: { deliveryAddress: [{ code: "invalid", message: faults.deliveryAddressRefused }] },
    } satisfies Schemas["Error"]);
  }
  const address = body.deliveryAddress!;
  const zone = ZONES.find((candidate) => candidate.id === address.zoneId) ?? ZONES[0];
  instance.orders += 1;
  const guest = !instance.scenario.me;
  const beneficiary = body.beneficiaryId === undefined ? null : { id: body.beneficiaryId, firstName: "Léa" };
  const order = kitsOrder(`CMD-KIT-${instance.orders}`, lines, zone, address, rates, {
    beneficiary,
    expiresAt: inMinutes(30),
  });
  const token = guest ? `jeton-${randomUUID()}` : null;
  putOrder(instance, order, token);
  respond(201, { ...order, guestToken: token } satisfies Schemas["OrderCreated"]);
}

route("GET", /^\/api\/payments\/orders\/([\w-]+)\/$/, "invite", async (context) => {
  const { instance, match, respond } = context;
  const { faults } = instance.scenario;
  if (faults.orderReadDelayMs) await sleep(faults.orderReadDelayMs);
  if (once(instance, "order-read-error", faults.orderReadError)) return respond(500, SERVER_ERROR);
  const order = accessOrder(context, match[1]);
  if (order) respond(200, order);
  else fail(respond, "NOT_FOUND", "Introuvable.");
});

/** Contenu minimal d'un PDF : le test vérifie le nom du fichier téléchargé, pas son contenu (c'est l'affaire de l'API). */
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");

route("GET", /^\/api\/payments\/orders\/([\w-]+)\/invoice\/$/, "invite", (context) => {
  const { instance, match, respond } = context;
  const { faults } = instance.scenario;
  const order = accessOrder(context, match[1]);
  if (!order?.invoice || order.status !== "paid") return fail(respond, "NOT_FOUND", "Introuvable.");
  if (faults.invoiceServerError) return respond(500, SERVER_ERROR);
  if (faults.invoiceNotReady || order.invoice.pdfStatus !== "ready") return fail(respond, "PDF_NOT_READY");
  respond(200, PDF, {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="facture-${order.invoice.number}.pdf"`,
  });
});
