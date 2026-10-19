import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Loader } from "@/components/ds/Loader";
import { BadgeScreen } from "@/features/learning/quiz/BadgeScreen";

export const metadata: Metadata = { title: "Badge de projet" };

/** Identifiant entier positif lu dans l'URL, sinon `null`. */
function idOf(value: unknown): number | null {
  const id = Number(value);
  return typeof value === "string" && Number.isInteger(id) && id > 0 ? id : null;
}

// WJ11 · Plein écran, hors shell ; la tentative (`?tentative=`) donne l'étape suivante.
export default async function BadgePage({
  params,
  searchParams,
}: PageProps<"/apprenant/parcours/[slug]/projets/[projectId]/badge">) {
  const [{ slug, projectId }, { tentative }] = await Promise.all([params, searchParams]);
  const id = idOf(projectId);
  if (id === null) notFound();
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <Loader label="Ton badge arrive…" />
        </div>
      }
    >
      <BadgeScreen slug={slug} kind="project" id={id} attemptId={idOf(tentative)} />
    </Suspense>
  );
}
