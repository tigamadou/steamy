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

/** Commentaires des enseignants visibles par le parent (D63), un par page au plus. */
export const TEACHER_COMMENTS_PAGE_SIZE = 20;

/**
 * Commentaires des enseignants sur l'enfant (`GET classrooms/comments/?learnerId=`, API-L5), les plus récents
 * d'abord. Bloc secondaire de WPD03 : une lecture en échec n'empêche pas d'afficher l'enfant (liste vide).
 */
export async function getTeacherComments(id: string): Promise<Schemas["LearnerComment"][]> {
  const api = await getServerApi();
  const { data } = await api.GET("/api/classrooms/comments/", {
    params: { query: { learnerId: Number(id), pageSize: TEACHER_COMMENTS_PAGE_SIZE } },
  });
  return data?.results ?? [];
}
