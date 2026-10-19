import type { Schemas } from "@steamy/api-client";
import { notFound } from "next/navigation";

/** Refus d'accès au contenu (§4.4) : pas inscrit, ou étape pas encore ouverte. */
export type LockedCode = "CONTENT_LOCKED" | "NOT_ENROLLED";

export type Content<T> = { ok: true; data: T } | { ok: false; code: LockedCode };

type ApiResponse<T> = { data?: T; error?: Schemas["Error"]; response: Response };

/**
 * Réponse d'un contenu pédagogique lu côté serveur : les données, ou le refus (`CONTENT_LOCKED`, `NOT_ENROLLED`)
 * qui affiche `LockedContentState` (jamais de contenu masqué en CSS). Élément inconnu → 404 ; autre erreur levée
 * vers `error.tsx`.
 */
export function readContent<T>({ data, error, response }: ApiResponse<T>): Content<T> {
  if (data !== undefined) return { ok: true, data };
  if (response.status === 404) notFound();
  if (error?.code === "CONTENT_LOCKED" || error?.code === "NOT_ENROLLED") return { ok: false, code: error.code };
  throw new Error(`Contenu illisible (${response.status})`);
}

/** URL de téléchargement d'un certificat, servie par l'API (redirection vers une URL présignée, ADR 0005). */
export function certificateDownloadUrl(id: number): string {
  return `${process.env.PUBLIC_API_URL ?? ""}/api/learning/certificates/${id}/download/`;
}
