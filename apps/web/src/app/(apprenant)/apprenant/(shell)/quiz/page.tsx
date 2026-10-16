import type { Metadata } from "next";
import { Suspense } from "react";

import type { AttemptStatus } from "@/components/ds/AttemptStatusBadge";
import { ATTEMPT_STATUSES, AttemptsList, AttemptsSkeleton } from "@/features/learning/attempts/AttemptsList";

export const metadata: Metadata = { title: "Mes quiz" };

/** Statut du filtre (`?statut=`), ignoré s'il n'est pas un statut de l'API. */
function statusOf(value: string | string[] | undefined): AttemptStatus | null {
  return ATTEMPT_STATUSES.find((status) => status === value) ?? null;
}

/** Page (`?page=`), 1 par défaut. */
function pageOf(value: string | string[] | undefined): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 1 ? page : 1;
}

// WD07 / WD09 · Mes tentatives de quiz, filtrées par statut dans l'URL.
export default async function AttemptsPage({ searchParams }: PageProps<"/apprenant/quiz">) {
  const { statut, page } = await searchParams;
  const status = statusOf(statut);
  const current = pageOf(page);
  return (
    <Suspense key={`${status}-${current}`} fallback={<AttemptsSkeleton />}>
      <AttemptsList status={status} page={current} />
    </Suspense>
  );
}
