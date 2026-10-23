import type { Schemas } from "@steamy/api-client";
import { notFound } from "next/navigation";

import { getServerApi } from "@/lib/api";
import { readOrNull } from "@/lib/api-read";

export type SupervisedCourse = Schemas["SupervisedCourse"];
export type SupervisedCourseDetail = Schemas["SupervisedCourseDetail"];

/** Parcours lus pour WT02 : un enseignant en encadre quelques-uns, tous tiennent sur une page. */
export const COURSES_PAGE_SIZE = 50;

/**
 * Parcours encadrés par l'enseignant (`GET classrooms/courses/`), ceux de ses classes seulement (D64). `null` sans
 * session (la garde du layout redirige).
 */
export async function getSupervisedCourses(): Promise<SupervisedCourse[] | null> {
  const api = await getServerApi();
  const list = readOrNull(
    await api.GET("/api/classrooms/courses/", { params: { query: { pageSize: COURSES_PAGE_SIZE } } }),
  );
  return list && (list.results ?? []);
}

/**
 * Un parcours encadré et son arbre (`GET classrooms/courses/{slug}/`). Un parcours qu'il n'encadre pas, ou qui
 * n'existe pas, est introuvable (`notFound()`), sans distinguer « interdit » (D64). `null` sans session.
 */
export async function getSupervisedCourse(slug: string): Promise<SupervisedCourseDetail | null> {
  const api = await getServerApi();
  const result = await api.GET("/api/classrooms/courses/{slug}/", { params: { path: { slug } } });
  if (result.response.status === 404) notFound();
  return readOrNull(result);
}

/**
 * Une mission d'un parcours encadré, en lecture seule (`GET classrooms/courses/{slug}/missions/{id}/`). Une mission
 * d'un parcours non encadré, ou un identifiant qui n'est pas un nombre, est introuvable (`notFound()`).
 */
export async function getSupervisedMission(slug: string, id: string): Promise<Schemas["MissionRead"] | null> {
  if (!/^\d+$/.test(id)) notFound();
  const api = await getServerApi();
  const result = await api.GET("/api/classrooms/courses/{slug}/missions/{id}/", {
    params: { path: { slug, id: Number(id) } },
  });
  if (result.response.status === 404) notFound();
  return readOrNull(result);
}
