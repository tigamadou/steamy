import { getServerApi } from "@/lib/api";

import type { PaymentRequest } from "./types";

/** Demandes en attente lues d'un coup : un apprenant n'en a que quelques-unes (une par parcours au plus). */
const PAGE_SIZE = 50;

/** WA02 / WK08 : la demande de l'apprenant, ou `null` si elle n'existe pas ou n'est pas la sienne (404). */
export async function getPaymentRequest(id: number): Promise<PaymentRequest | null> {
  const api = await getServerApi();
  const { data, response } = await api.GET("/api/payments/payment-requests/{id}/", { params: { path: { id } } });
  if (response.status === 404) return null;
  if (!data) throw new Error(`Demande de paiement illisible (${response.status})`);
  return data;
}

/** Demandes encore à régler par le parent (WC05, bandeau de WD23, WD14). */
export async function getPendingRequests(): Promise<PaymentRequest[]> {
  const api = await getServerApi();
  const { data, response } = await api.GET("/api/payments/payment-requests/", {
    params: { query: { status: "pending", pageSize: PAGE_SIZE } },
  });
  if (!data) throw new Error(`Demandes de paiement illisibles (${response.status})`);
  return data.results ?? [];
}
