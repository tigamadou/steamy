import type { Schemas } from "@steamy/api-client";

import { Button, Mascot, SectionHeader, SkeletonBlock, StatPill } from "@/components/ds";
import { getServerApi } from "@/lib/api";
import { readOrNull } from "@/lib/api-read";
import { routes } from "@/lib/routes";

import { ClassCard } from "./ClassCard";
import { DropoutRow } from "./DropoutRow";
import { ReviewRow } from "./ReviewRow";

type Dashboard = Schemas["TeacherDashboard"];

const t = routes.teacher;

/** « 3 classes · 54 élèves encadrés » ; sans classe, l'invitation à en créer une. */
export function classesHeadline({ classroomCount, learnerCount }: Pick<Dashboard, "classroomCount" | "learnerCount">): string {
  if (classroomCount === 0) return "Aucune classe pour l'instant";
  const classes = `${classroomCount} classe${classroomCount > 1 ? "s" : ""}`;
  const learners = `${learnerCount} élève${learnerCount > 1 ? "s" : ""} encadré${learnerCount > 1 ? "s" : ""}`;
  return `${classes} · ${learners}`;
}

function Hero({ dashboard }: { dashboard: Dashboard }) {
  return (
    <section
      aria-labelledby="accueil-enseignant"
      className="relative flex min-h-40 items-center gap-6 overflow-hidden rounded-[22px] bg-linear-135 from-primary-500 to-primary-700 px-5 py-6 text-white sm:px-7"
    >
      <div className="relative flex min-w-0 flex-1 flex-col gap-2 sm:max-w-[60%]">
        <p className="m-0 text-[11px] font-extrabold tracking-[0.08em] uppercase">Espace enseignant</p>
        <h2 id="accueil-enseignant" className="m-0 text-2xl leading-tight font-black tracking-[-0.01em] text-white">
          {classesHeadline(dashboard)}
        </h2>
        <p className="m-0 max-w-105 text-sm leading-normal font-semibold">
          Suivez la progression de vos classes, commentez les tentatives à revoir et accompagnez chaque élève.
        </p>
        {dashboard.classroomCount > 0 && (
          <div className="mt-3">
            <Button href={t.addLearners()} variant="amber" icon="plus">
              Ajouter des élèves
            </Button>
          </div>
        )}
      </div>
      <div aria-hidden className="pointer-events-none absolute -top-2 right-2 hidden md:block">
        <Mascot pose="focus" size={160} hue="#fff" />
      </div>
    </section>
  );
}

/** Aucune classe : Zeti et « Créer une classe » → WT13. */
export function NoClassroom() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[18px] border-2 border-dashed border-primary-300 bg-primary-50 px-5 py-8 text-center">
      <Mascot pose="idle" size={110} />
      <p className="m-0 max-w-120 text-sm font-semibold text-ink-700">
        Créez votre première classe : choisissez un parcours de l&apos;offre de votre établissement, puis invitez vos
        élèves.
      </p>
      <Button href={t.newClassroom} icon="plus">
        Créer une classe
      </Button>
    </div>
  );
}

function EmptyList({ children }: { children: string }) {
  return (
    <p className="m-0 rounded-[14px] border border-dashed border-ink-200 bg-surface px-4.5 py-5 text-sm font-semibold text-ink-600">
      {children}
    </p>
  );
}

/** WT01 · contenu, une fois les données lues. */
export function TeacherHomeView({ dashboard }: { dashboard: Dashboard }) {
  const { classrooms, toReview, dropouts } = dashboard;
  return (
    <div className="flex flex-col gap-5">
      <Hero dashboard={dashboard} />
      <section aria-label="Vos statistiques" className="flex flex-col gap-4 sm:flex-row">
        <StatPill icon="user" label="Élèves" value={dashboard.learnerCount} tone="primary" />
        <StatPill icon="book" label="Classes" value={dashboard.classroomCount} tone="success" />
        <StatPill icon="star" label="À revoir" value={dashboard.toReviewCount} tone="amber" />
      </section>
      <section aria-labelledby="mes-classes">
        <SectionHeader
          id="mes-classes"
          title="Mes classes"
          action={classrooms.length > 0 ? { label: "Voir tout", href: t.classes } : undefined}
        />
        {classrooms.length === 0 ? (
          <NoClassroom />
        ) : (
          <ul aria-label="Mes classes" className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {classrooms.map((classroom) => (
              <li key={classroom.id}>
                <ClassCard classroom={classroom} />
              </li>
            ))}
          </ul>
        )}
      </section>
      {classrooms.length > 0 && (
        <>
          <section aria-labelledby="a-revoir">
            <SectionHeader
              id="a-revoir"
              title="À revoir"
              action={
                dashboard.toReviewCount > toReview.length
                  ? { label: `Voir tout (${dashboard.toReviewCount})`, href: t.reviews({ filter: "a-revoir" }) }
                  : undefined
              }
            />
            {toReview.length === 0 ? (
              <EmptyList>Aucune tentative à revoir pour le moment.</EmptyList>
            ) : (
              <ul aria-label="Tentatives à revoir" className="m-0 flex list-none flex-col gap-2 p-0">
                {toReview.map((review) => (
                  <li key={review.id}>
                    <ReviewRow review={review} />
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section aria-labelledby="decrochage">
            <SectionHeader id="decrochage" title="Décrochage" />
            {dropouts.length === 0 ? (
              <EmptyList>Aucun élève en décrochage : tous ont été actifs récemment.</EmptyList>
            ) : (
              <ul aria-label="Élèves en décrochage" className="m-0 flex list-none flex-col gap-2 p-0">
                {dropouts.map((dropout) => (
                  <li key={`${dropout.classroom.id}-${dropout.learner.id}`}>
                    <DropoutRow dropout={dropout} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

/** WT01 · accueil de l'enseignant : compteurs, classes, « À revoir » et « Décrochage », lus côté serveur. */
export async function TeacherHome() {
  const api = await getServerApi();
  const dashboard = readOrNull(await api.GET("/api/classrooms/dashboard/"));
  if (!dashboard) return null;
  return <TeacherHomeView dashboard={dashboard} />;
}

/** Squelette de WT01 : bandeau, pastilles, cartes de classes et listes. */
export function TeacherHomeSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Chargement de votre espace…" className="flex flex-col gap-5">
      <SkeletonBlock className="h-40 rounded-[22px]" />
      <div className="flex flex-col gap-4 sm:flex-row">
        <SkeletonBlock className="h-16 rounded-lg" />
        <SkeletonBlock className="h-16 rounded-lg" />
        <SkeletonBlock className="h-16 rounded-lg" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SkeletonBlock className="h-32 rounded-[18px]" />
        <SkeletonBlock className="h-32 rounded-[18px]" />
        <SkeletonBlock className="hidden h-32 rounded-[18px] lg:block" />
      </div>
      <SkeletonBlock className="h-18 rounded-[14px]" />
      <SkeletonBlock className="h-18 rounded-[14px]" />
    </div>
  );
}
