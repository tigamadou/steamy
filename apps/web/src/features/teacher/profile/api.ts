import type { Schemas } from "@steamy/api-client";
import { notFound } from "next/navigation";

import { getServerApi } from "@/lib/api";
import { readOrNull } from "@/lib/api-read";

export type LearnerFollowUp = Schemas["LearnerFollowUp"];
export type TeacherAttempt = Schemas["TeacherAttempt"];
export type TeacherComment = Schemas["TeacherComment"];

/**
 * Suivi d'un élève sur le parcours d'une de mes classes (`GET classrooms/learners/{id}/?classroomId=`). Un élève qui
 * n'est dans aucune de mes classes (ou pas dans la classe demandée), ou un identifiant qui n'est pas un nombre, est
 * introuvable (`notFound()`), jamais « interdit » (D64). `null` sans session (la garde du layout redirige).
 */
export async function getLearnerFollowUp(id: string, classroomId?: string): Promise<LearnerFollowUp | null> {
  if (!/^\d+$/.test(id)) notFound();
  const api = await getServerApi();
  const result = await api.GET("/api/classrooms/learners/{id}/", {
    params: {
      path: { id: Number(id) },
      query: classroomId && /^\d+$/.test(classroomId) ? { classroomId: Number(classroomId) } : {},
    },
  });
  if (result.response.status === 404) notFound();
  return readOrNull(result);
}
