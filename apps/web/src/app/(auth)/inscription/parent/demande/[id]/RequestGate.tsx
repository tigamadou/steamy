import type { Schemas } from "@steamy/api-client";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getServerApi } from "@/lib/api";
import { homeForRole, type Me } from "@/lib/auth/home-for-role";
import { loginUrl } from "@/lib/auth/safe-next";
import { getCurrentUser } from "@/lib/auth/session";

export type ConsentRequest = Schemas["ConsentRequest"];

/** Écran d'une demande selon son état : WP05 en attente, WP06 acceptée, WP12 refusée. */
export function requestPath(id: number | string, status: string): string {
  const base = `/inscription/parent/demande/${id}`;
  if (status === "accepted") return `${base}/acceptee`;
  if (status === "refused") return `${base}/refusee`;
  return base;
}

/**
 * Garde des écrans d'une demande (WP05, WP06, WP11, WP12), sous `<Suspense>` : parent connecté (sinon connexion
 * avec retour ici), demande adressée à son numéro vérifié (sinon 404, sans aucun détail sur l'enfant).
 */
export async function RequestGate({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: (request: ConsentRequest, me: Me) => ReactNode;
}) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (!me) redirect(loginUrl(`/inscription/parent/demande/${id}`));
  if (me.role !== "parent") redirect(homeForRole(me));
  const api = await getServerApi();
  const { data } = await api.GET("/api/accounts/consent-requests/{id}/", { params: { path: { id } } });
  if (!data) notFound();
  return children(data, me);
}
