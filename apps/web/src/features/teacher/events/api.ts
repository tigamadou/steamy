import type { Schemas } from "@steamy/api-client";

import { getServerApi } from "@/lib/api";
import { readOrNull } from "@/lib/api-read";

export type ClassroomEventApplication = Schemas["ClassroomEventApplication"];

/** Candidatures lues pour WT09 : celles des élèves de mes classes, une page suffit à l'affichage en lecture seule. */
export const APPLICATIONS_PAGE_SIZE = 50;

/**
 * Candidatures de mes élèves aux Steamy Events (`GET classrooms/event-applications/`), en lecture seule : chaque élève
 * candidate seul, avec l'accord de son parent (S8, C3). `null` sans session.
 */
export async function getEventApplications(): Promise<ClassroomEventApplication[] | null> {
  const api = await getServerApi();
  const list = readOrNull(
    await api.GET("/api/classrooms/event-applications/", { params: { query: { pageSize: APPLICATIONS_PAGE_SIZE } } }),
  );
  return list && (list.results ?? []);
}
