import type { Schemas } from "@steamy/api-client";
import { notFound } from "next/navigation";

import { getServerApi } from "@/lib/api";
import { readOrNull } from "@/lib/api-read";

export type ChildDetail = Schemas["ChildDetail"];

/**
 * Détail d'un enfant du parent connecté (`GET accounts/children/{id}/`), côté serveur (WPD03, WPD10). L'enfant d'un
 * autre parent, ou un identifiant qui n'est pas un nombre, n'existe pas : « Enfant introuvable » (`notFound()`), sans
 * distinguer « interdit ». `null` sans session (la garde du layout redirige).
 */
export async function getChild(id: string): Promise<ChildDetail | null> {
  if (!/^\d+$/.test(id)) notFound();
  const api = await getServerApi();
  const result = await api.GET("/api/accounts/children/{id}/", { params: { path: { id } } });
  if (result.response.status === 404) notFound();
  return readOrNull(result);
}
