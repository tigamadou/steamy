import type { Schemas } from "@steamy/api-client";

import { apiCall, type ApiResult } from "@/lib/api-call";

import { asRequest, type PaymentRequest } from "./types";

// Écritures du déblocage (WA01, WA02, WK08) par le client navigateur (CSRF automatique).

/** WA01 : consomme le Kit Code et inscrit l'apprenant (201) ; déjà inscrit : 200, code non consommé. */
export function redeemKitCode(code: string, courseSlug: string): Promise<ApiResult<Schemas["KitCodeRedeemed"]>> {
  return apiCall((api) => api.POST("/api/payments/kit-codes/redeem/", { body: { code, courseSlug } }));
}

async function requestCall(
  call: Parameters<typeof apiCall<Schemas["PaymentRequest"]>>[0],
): Promise<ApiResult<PaymentRequest>> {
  const result = await apiCall(call);
  return result.ok ? { ok: true, data: asRequest(result.data) } : result;
}

/**
 * WC05 → WA02 (`kind: "course"`) ou WK03 → WK08 (`kind: "kit"`, lignes du panier) : demande au parent. Le montant est
 * calculé par le serveur ; une demande déjà en attente pour le même parcours est renvoyée telle quelle (200).
 */
export function createPaymentRequest(
  body: Schemas["PaymentRequestCreateRequest"],
): Promise<ApiResult<PaymentRequest>> {
  return requestCall((api) => api.POST("/api/payments/payment-requests/", { body }));
}

/** WA02 : relit la demande (interrogation toutes les 10 s). */
export function readPaymentRequest(id: number): Promise<ApiResult<PaymentRequest>> {
  return requestCall((api) => api.GET("/api/payments/payment-requests/{id}/", { params: { path: { id } } }));
}

/** WA02 : relance du parent, limitée par le serveur (`THROTTLED` avant `nextResendAt`). */
export function resendPaymentRequest(id: number): Promise<ApiResult<PaymentRequest>> {
  return requestCall((api) => api.POST("/api/payments/payment-requests/{id}/resend/", { params: { path: { id } } }));
}

/** WA02, WK08 : annulation par l'apprenant tant que la demande est en attente (`PAYMENT_REQUEST_CLOSED` sinon). */
export function cancelPaymentRequest(id: number): Promise<ApiResult<PaymentRequest>> {
  return requestCall((api) => api.POST("/api/payments/payment-requests/{id}/cancel/", { params: { path: { id } } }));
}
