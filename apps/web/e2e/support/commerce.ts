import { expect } from "@playwright/test";

import { apiSession, type ApiSession } from "./api";
import { DEMO_PASSWORD } from "./demo";

/**
 * Achats du parent par l'API, en attendant ses écrans (WPD15, lot 4) : commande, paiement par le faux prestataire
 * (numéro en `…01` : succès, notifié par un webhook signé que traite le worker Celery), puis lecture de la commande
 * payée. Les parcours du lot 3 (P2, P3, P5) s'en servent pour obtenir un Kit Code ou régler une demande de l'enfant.
 */

/** Numéro Mobile Money du faux prestataire qui réussit (`apps/payments/providers/fake.py`). */
export const SUCCESS_MSISDN = "+2290197000001";

type Order = { reference: string; status: string; kitCodes: { code: string }[] };

/** Session API du parent créé par `createLearner()` (connexion par téléphone). */
export async function parentSession(phone: string): Promise<ApiSession> {
  const session = await apiSession();
  await session.post("/api/auth/login/", { identifier: phone, password: DEMO_PASSWORD });
  return session;
}

/** Paie la commande puis attend que le serveur la passe à `paid` (webhook asynchrone). */
async function payOrder(session: ApiSession, reference: string): Promise<Order> {
  const [network] = (await session.get("/api/referentials/payment-networks/?country=BJ")) as { code: string }[];
  await session.post(`/api/payments/orders/${reference}/payments/`, {
    country: "BJ",
    network: network.code,
    msisdn: SUCCESS_MSISDN,
  });
  let order: Order | undefined;
  await expect
    .poll(
      async () => {
        order = (await session.get(`/api/payments/orders/${reference}/`)) as Order;
        return order.status;
      },
      { timeout: 30_000, message: `commande ${reference} payée` },
    )
    .toBe("paid");
  return order as Order;
}

/** Adresse de livraison saisie par le parent (WPD15), dans la première zone du Bénin. */
async function deliveryAddress(session: ApiSession) {
  const [zone] = (await session.get("/api/shop/delivery-zones/?country=BJ")) as { id: number }[];
  return { zoneId: zone.id, recipientName: "Parent Test", city: "Cotonou", addressLine: "Rue de test" };
}

/** Le parent achète un kit et renvoie le Kit Code imprimé sur sa notice. */
export async function buyKitCode(parentPhone: string, kitSlug: string): Promise<string> {
  const session = await parentSession(parentPhone);
  const { reference } = (await session.post("/api/payments/orders/", {
    kind: "kit",
    items: [{ kitSlug, quantity: 1 }],
    deliveryAddress: await deliveryAddress(session),
  })) as Order;
  const order = await payOrder(session, reference);
  await session.api.dispose();
  expect(order.kitCodes.length, "Kit Code généré au paiement").toBeGreaterThan(0);
  return order.kitCodes[0].code;
}

/**
 * Le parent règle la demande de son enfant (WPD15 par l'API), en ajoutant l'adresse de livraison pour une demande de
 * kit (C10) ; renvoie la référence de la commande.
 */
export async function payPaymentRequest(
  parentPhone: string,
  requestId: number,
  { kit = false }: { kit?: boolean } = {},
): Promise<string> {
  const session = await parentSession(parentPhone);
  const { reference } = (await session.post("/api/payments/orders/", {
    paymentRequestId: requestId,
    ...(kit ? { deliveryAddress: await deliveryAddress(session) } : {}),
  })) as Order;
  await payOrder(session, reference);
  await session.api.dispose();
  return reference;
}
