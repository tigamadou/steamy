import type { QuizAnswers } from "@/components/ds/Quiz";
import { FLOW_STORAGE_PREFIX } from "@/lib/auth/logout";

/** Brouillon d'un quiz en cours (onglet seulement, purgé à la déconnexion) : réponses, question, début. */
export type QuizDraft = { answers: QuizAnswers; index: number; startedAt: number };

export function draftKey(quizId: number): string {
  return `${FLOW_STORAGE_PREFIX}quiz:${quizId}`;
}

/** Brouillon brut de l'onglet (chaîne stable pour `useSyncExternalStore`), `null` si absent ou inaccessible. */
export function readRawDraft(quizId: number): string | null {
  try {
    return sessionStorage.getItem(draftKey(quizId));
  } catch {
    return null;
  }
}

/** Brouillon lisible et compatible avec le quiz (`questionCount` questions), sinon `null`. */
export function parseDraft(raw: string | null, questionCount: number): QuizDraft | null {
  if (raw === null) return null;
  try {
    const draft = JSON.parse(raw) as QuizDraft;
    return draft.index < questionCount ? draft : null;
  } catch {
    return null;
  }
}

export function writeDraft(quizId: number, draft: QuizDraft): void {
  try {
    sessionStorage.setItem(draftKey(quizId), JSON.stringify(draft));
  } catch {
    // Stockage indisponible : le quiz reprendra à la première question après un rechargement
  }
}

export function clearDraft(quizId: number): void {
  try {
    sessionStorage.removeItem(draftKey(quizId));
  } catch {
    // Rien à effacer
  }
}
