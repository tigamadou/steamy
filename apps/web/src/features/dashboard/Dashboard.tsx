import type { Schemas } from "@steamy/api-client";
import { Suspense } from "react";

import { Button, Mascot, QuickActionTile, SectionHeader, StatPill } from "@/components/ds";
import { getServerApi } from "@/lib/api";
import { readOrNull } from "@/lib/api-read";
import { features } from "@/lib/features";
import { routes } from "@/lib/routes";

import { CourseGrid, GRID } from "./CourseGrid";
import { CourseGridSkeleton } from "./DashboardSkeleton";
import { ResumeCard } from "./ResumeCard";
import { StarterSuggestions } from "./StarterSuggestions";

type DashboardData = Schemas["Dashboard"];

const l = routes.learner;
const POINTS = new Intl.NumberFormat("fr-FR");

/** « 1 jour », « 5 jours » (0 inclus : « 0 jour »). */
export function daysLabel(days: number): string {
  return `${days} jour${days > 1 ? "s" : ""}`;
}

/** « Aucun parcours », « 1 parcours », « 3 parcours ». */
export function coursesLabel(count: number): string {
  return count === 0 ? "Aucun parcours" : `${count} parcours`;
}

/**
 * Pastilles de WD01 : le streak toujours, les points et le rang seulement si l'API les renvoie (D34, C8). Aucune
 * valeur ni barème n'est calculé ici.
 */
export function DashboardStats({ data }: { data: Pick<DashboardData, "streakDays" | "points" | "rank"> }) {
  return (
    <section aria-label="Tes statistiques" className="flex flex-col gap-4 sm:flex-row">
      <StatPill icon="flame" label="Streak" value={daysLabel(data.streakDays)} tone="amber" />
      {data.points !== null && (
        <StatPill icon="sparkle" label="Points" value={POINTS.format(data.points)} tone="primary" />
      )}
      {data.rank !== null && <StatPill icon="rocket" label="Rang" value={data.rank.label} tone="success" />}
    </section>
  );
}

/** Raccourcis de WD01 : Steamy Events seulement quand le drapeau `events` est levé (3.8), jamais « Bientôt ». */
export function QuickActions({ wishlist }: { wishlist: number }) {
  return (
    <nav aria-label="Raccourcis" className={GRID}>
      <QuickActionTile icon="compass" title="Catalogue" href={l.catalog} tone="primary" />
      <QuickActionTile icon="heart" title="Mes souhaits" count={coursesLabel(wishlist)} href={l.wishlist} tone="amber" />
      <QuickActionTile icon="book" title="Mes quiz" href={l.attempts} tone="success" />
      {features.events && <QuickActionTile icon="trophy" title="Steamy Events" href={l.events} tone="primary" />}
    </nav>
  );
}

/** WD01 · accueil avec un parcours à reprendre. */
function ResumeDashboard({ data, resume }: { data: DashboardData; resume: Schemas["Enrollment"] }) {
  return (
    <div className="flex flex-col gap-5">
      <ResumeCard enrollment={resume} />
      <DashboardStats data={data} />
      <QuickActions wishlist={data.counters.wishlist} />
      <section aria-labelledby="pour-toi">
        <SectionHeader id="pour-toi" title="Pour toi" action={{ label: "Voir tout", href: l.catalog }} />
        {data.recommendations.length > 0 ? (
          <CourseGrid courses={data.recommendations} />
        ) : (
          <p className="m-0 text-sm font-semibold text-ink-600">
            Tu suis déjà tous nos parcours publiés. Reviens voir le catalogue pour les prochains !
          </p>
        )}
      </section>
    </div>
  );
}

/** WD02 · accueil sans parcours à reprendre : bienvenue, catalogue filtré sur les parcours gratuits (D27). */
function WelcomeDashboard({ data }: { data: DashboardData }) {
  const finished = data.counters.completedEnrollments > 0;
  return (
    <div className="flex flex-col gap-6">
      <section
        aria-labelledby="bienvenue-titre"
        className="flex items-center gap-7 rounded-[22px] border-2 border-dashed border-primary-300 bg-primary-50 px-5 py-8 sm:px-7 sm:py-9"
      >
        <div className="flex-1">
          <h2 id="bienvenue-titre" className="m-0 mb-2 text-[28px] font-black tracking-[-0.01em] text-ink-900">
            {finished ? `Bravo ${data.firstName} !` : `Bienvenue ${data.firstName} !`}
          </h2>
          <p className="m-0 mb-4 max-w-[480px] text-[15px] leading-normal font-semibold text-ink-600">
            {finished
              ? "Tu as terminé tous tes parcours en cours. Choisis-en un nouveau pour continuer ton aventure robotique."
              : "Tu n'as pas encore commencé de parcours. Choisis-en un pour démarrer ton aventure robotique."}
          </p>
          <Button href={l.freeCatalog} size="lg" iconRight="arrow-right">
            Explorer le catalogue
          </Button>
        </div>
        <div aria-hidden className="hidden sm:block">
          <Mascot pose="wave" size={180} />
        </div>
      </section>
      <section aria-labelledby="suggestions">
        <SectionHeader
          id="suggestions"
          title="Suggestions pour bien démarrer"
          action={{ label: "Voir tout", href: l.freeCatalog }}
        />
        <Suspense fallback={<CourseGridSkeleton label="Chargement des suggestions…" />}>
          <StarterSuggestions />
        </Suspense>
      </section>
    </div>
  );
}

/** Tableau de bord de l'apprenant : WD01 s'il a un parcours à reprendre (`resume`), sinon WD02. */
export async function Dashboard() {
  const data = readOrNull(await (await getServerApi()).GET("/api/learning/dashboard/"));
  if (!data) return null;
  return data.resume ? <ResumeDashboard data={data} resume={data.resume} /> : <WelcomeDashboard data={data} />;
}
