import type { Schemas } from "@steamy/api-client";

import { apiCall, type ApiResult } from "@/lib/api-call";

// Commande de kits de l'invité (D12) par le client navigateur : création (prix, frais et total calculés par le
// serveur, D37), lecture, paiement et reçu, avec le jeton d'accès en en-tête `X-Guest-Token` (C10).

/** En-tête du jeton invité ; un compte connecté (parent) est reconnu par sa session. */
function guestHeader(token: string | null) {
  return token ? { "X-Guest-Token": token } : undefined;
}

export function getZones(country: string): Promise<ApiResult<Schemas["DeliveryZone"][]>> {
  return apiCall((api) => api.GET("/api/shop/delivery-zones/", { params: { query: { country } } }));
}

export type KitOrderInput = {
  items: Array<{ kitSlug: string; quantity: number }>;
  guest?: Schemas["GuestInputRequest"];
  deliveryAddress: Schemas["DeliveryAddressInputRequest"];
};

/** Crée la commande et réserve le stock (D38) ; le jeton invité n'est remis qu'ici. */
export function createKitOrder({ items, guest, deliveryAddress }: KitOrderInput): Promise<ApiResult<Schemas["OrderCreated"]>> {
  return apiCall((api) =>
    api.POST("/api/payments/orders/", { body: { kind: "kit", items, ...(guest ? { guest } : {}), deliveryAddress } }),
  );
}

export function getOrder(reference: string, token: string | null): Promise<ApiResult<Schemas["Order"]>> {
  return apiCall((api) =>
    api.GET("/api/payments/orders/{reference}/", { params: { path: { reference }, header: guestHeader(token) } }),
  );
}

export function payOrder(
  reference: string,
  token: string | null,
  body: Schemas["PaymentCreateRequest"],
): Promise<ApiResult<Schemas["Payment"]>> {
  return apiCall((api) =>
    api.POST("/api/payments/orders/{reference}/payments/", {
      params: { path: { reference }, header: guestHeader(token) },
      body,
    }),
  );
}

export function getPayment(id: number, token: string | null): Promise<ApiResult<Schemas["Payment"]>> {
  return apiCall((api) =>
    api.GET("/api/payments/payments/{id}/", { params: { path: { id }, header: guestHeader(token) } }),
  );
}

/** Facture PDF de la commande (C12), lue avec le jeton puis proposée au téléchargement. */
export function getInvoice(reference: string, token: string | null): Promise<ApiResult<Blob>> {
  return apiCall((api) =>
    api.GET("/api/payments/orders/{reference}/invoice/", {
      params: { path: { reference }, header: guestHeader(token) },
      parseAs: "blob",
    }),
  ) as Promise<ApiResult<Blob>>;
}
