import type { Schemas } from "@steamy/api-client";

import { Button } from "@/components/ds/Button";
import { Celebration } from "@/components/ds/Celebration";
import { Medal } from "@/components/ds/Medal";
import { getServerApi } from "@/lib/api";
import { routes } from "@/lib/routes";

import { LockedContentState } from "../LockedContentState";
import { nextStepHref } from "../next-step";

export type BadgeScreenProps = {
  slug: string;
  kind: "level" | "project";
  /** Niveau ou projet dont le badge est montré. */
  id: number;
  /** Tentative réussie qui l'a débloqué (`?tentative=`) : étape suivante et points, lus dans l'API. */
  attemptId: number | null;
};

/** Libellé du bouton vers l'étape suivante renvoyée par la tentative. */
function nextLabel(next: Schemas["NextStep"], kind: BadgeScreenProps["kind"]): string {
  if (next.type === "certification") return "Voir ma certification";
  if (next.type === "quiz" && next.quizKind === "summative") return "Passer l'évaluation du projet";
  return kind === "level" ? "Niveau suivant" : "Projet suivant";
}

// WJ06 (badge de niveau) / WJ11 (badge de projet) · Plein écran, hors shell. Aucun lien « Voir mes badges » (D39).
export async function BadgeScreen({ slug, kind, id, attemptId }: BadgeScreenProps) {
  const api = await getServerApi();
  const [badges, attempt] = await Promise.all([
    api.GET("/api/learning/badges/", { params: { query: { course: slug, pageSize: 100 } } }),
    attemptId === null ? null : api.GET("/api/learning/attempts/{id}/", { params: { path: { id: attemptId } } }),
  ]);
  const badge = (badges.data?.results ?? []).find((b) =>
    kind === "level" ? b.kind === "level" && b.levelId === id : b.kind === "project" && b.projectId === id,
  );
  if (!badge) {
    return (
      <main id="contenu" className="mx-auto max-w-lg px-4 py-12">
        <LockedContentState code="CONTENT_LOCKED" courseSlug={slug} />
      </main>
    );
  }
  const passed = attempt?.data?.passed ? attempt.data : null;
  return (
    <Celebration
      title={kind === "level" ? "Niveau terminé !" : "Projet validé !"}
      mascot={<Medal icon={badge.icon} label={badge.label} kind={kind} />}
      actions={
        <>
          {passed?.next && (
            <Button href={nextStepHref(passed.next)} size="lg" iconRight="arrow-right">
              {nextLabel(passed.next, kind)}
            </Button>
          )}
          <Button href={routes.learner.course(slug)} size="lg" variant="outline">
            Retour à mon parcours
          </Button>
        </>
      }
    >
      <p className="m-0 text-xs font-extrabold tracking-[.08em] text-success-800 uppercase">
        {kind === "level" ? "Badge de niveau débloqué" : "Badge de projet débloqué"}
      </p>
      <p className="m-0 mt-1 text-xl font-black text-ink-900">{badge.label}</p>
      <p className="m-0 mt-2 text-[15px] font-semibold text-ink-600">{badge.description}</p>
      {passed && (
        <p className="m-0 mt-2 text-sm font-bold text-ink-700">
          Score : {passed.percentage} %{passed.pointsEarned > 0 && ` · +${passed.pointsEarned} points`}
        </p>
      )}
    </Celebration>
  );
}
