import type { Schemas } from "@steamy/api-client";
import { notFound } from "next/navigation";

import { getServerApi } from "@/lib/api";
import { readOrNull } from "@/lib/api-read";

export type Classroom = Schemas["Classroom"];
export type School = Schemas["School"];
export type Member = Schemas["Member"];

/** Classes lues pour WT03 : un enseignant en a quelques-unes, toutes tiennent sur une page. */
export const CLASSROOMS_PAGE_SIZE = 50;
/** Lignes lues pour WT04 : le quota d'élèves d'une école borne la liste. */
export const MEMBERS_PAGE_SIZE = 200;

/** Classes de l'enseignant (`GET classrooms/`). `null` sans session (la garde du layout redirige). */
export async function getClassrooms(): Promise<Classroom[] | null> {
  const api = await getServerApi();
  const list = readOrNull(
    await api.GET("/api/classrooms/", { params: { query: { pageSize: CLASSROOMS_PAGE_SIZE } } }),
  );
  return list && (list.results ?? []);
}

/** École, offre, quotas et parcours de l'offre (`GET classrooms/school/`). `null` sans session. */
export async function getSchool(): Promise<School | null> {
  const api = await getServerApi();
  return readOrNull(await api.GET("/api/classrooms/school/"));
}

/**
 * Une classe de l'enseignant (`GET classrooms/{id}/`). Une classe d'un autre enseignant, inexistante, ou un
 * identifiant qui n'est pas un nombre, est introuvable (`notFound()`), jamais « interdite » (D64). `null` sans session.
 */
export async function getClassroom(id: string): Promise<Classroom | null> {
  if (!/^\d+$/.test(id)) notFound();
  const api = await getServerApi();
  const result = await api.GET("/api/classrooms/{id}/", { params: { path: { id } } });
  if (result.response.status === 404) notFound();
  return readOrNull(result);
}

/** Élèves actifs et invitations d'une classe (`GET classrooms/{id}/members/`), 404 comme `getClassroom`. */
export async function getMembers(id: string): Promise<Member[] | null> {
  if (!/^\d+$/.test(id)) notFound();
  const api = await getServerApi();
  const result = await api.GET("/api/classrooms/{id}/members/", {
    params: { path: { id }, query: { pageSize: MEMBERS_PAGE_SIZE } },
  });
  if (result.response.status === 404) notFound();
  const list = readOrNull(result);
  return list && (list.results ?? []);
}
