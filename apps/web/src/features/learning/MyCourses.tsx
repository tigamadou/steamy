import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ds/Button";
import { Mascot } from "@/components/ds/Mascot";
import { SkeletonBlock } from "@/components/ds/SkeletonBlock";
import { getServerApi } from "@/lib/api";
import { routes } from "@/lib/routes";

import { certificateDownloadUrl } from "./content";
import { DoneCourseCard, EnrolledCourseCard } from "./EnrolledCourseCard";

export type CoursesTab = "active" | "completed";

/** Nombre d'inscriptions lues d'un coup : un apprenant suit quelques parcours, la liste n'est pas paginée. */
const PAGE_SIZE = 50;

type Counts = Record<CoursesTab, number>;

/**
 * WD23 · Données de « Mes parcours » : inscriptions en cours et terminées (pour les compteurs des onglets) et
 * certificats (parcours terminés). Les onglets sont rendus par l'appelant avec les compteurs.
 */
export async function MyCourses({ tab, children }: { tab: CoursesTab; children: (counts: Counts) => ReactNode }) {
  const api = await getServerApi();
  const list = (status: CoursesTab) =>
    api.GET("/api/learning/enrollments/", { params: { query: { status, pageSize: PAGE_SIZE } } });
  const [active, completed, certificates] = await Promise.all([
    list("active"),
    list("completed"),
    api.GET("/api/learning/certificates/", { params: { query: { pageSize: PAGE_SIZE } } }),
  ]);
  if (!active.data || !completed.data) throw new Error("Inscriptions illisibles");
  const enrollments = { active: active.data.results ?? [], completed: completed.data.results ?? [] };
  const counts = { active: active.data.count ?? 0, completed: completed.data.count ?? 0 };

  if (counts.active + counts.completed === 0) {
    return (
      <>
        {children(counts)}
        <section
          aria-labelledby="aucun-parcours"
          className="flex flex-col items-center gap-6 rounded-[22px] border-2 border-dashed border-primary-300 bg-primary-50 px-6 py-8 sm:flex-row sm:px-7"
        >
          <div className="flex flex-1 flex-col items-start gap-3">
            <h2 id="aucun-parcours" className="m-0 text-2xl font-black text-ink-900">
              Tu n&apos;as pas encore de parcours
            </h2>
            <p className="m-0 max-w-120 text-[15px] leading-normal font-semibold text-ink-600">
              Commence par un parcours gratuit : tu pourras le suivre tout de suite, sans attendre ton parent.
            </p>
            <Button href={`${routes.learner.catalog}?prix=gratuit`} variant="secondary" size="lg" iconRight="arrow-right">
              Commence par un parcours gratuit
            </Button>
          </div>
          <Mascot pose="wave" size={160} />
        </section>
        <p className="m-0 text-center text-[13px] font-bold text-ink-600">
          Tu as reçu un kit Steamy ? Saisis ton Kit Code depuis la fiche du parcours pour le débloquer.
        </p>
      </>
    );
  }

  const shown = enrollments[tab];
  const certificateOf = new Map((certificates.data?.results ?? []).map((c) => [c.course.slug, c]));
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {children(counts)}
        {tab === "active" && shown.length > 1 && (
          <span className="text-[13px] font-bold text-ink-600">Triés par dernière activité</span>
        )}
      </div>
      {shown.length === 0 ? (
        <p className="m-0 rounded-lg bg-ink-50 p-4 text-sm font-bold text-ink-600">
          {tab === "active"
            ? "Aucun parcours en cours : tous tes parcours sont terminés. Bravo !"
            : "Aucun parcours terminé pour l'instant. Continue tes missions : ta certification t'attend."}
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {shown.map((enrollment) => {
            const certificate = certificateOf.get(enrollment.course.slug) ?? null;
            return (
              <li key={enrollment.id}>
                {tab === "active" ? (
                  <EnrolledCourseCard enrollment={enrollment} />
                ) : (
                  <DoneCourseCard
                    enrollment={enrollment}
                    certificate={certificate}
                    downloadUrl={certificate?.pdfStatus === "ready" ? certificateDownloadUrl(certificate.id) : undefined}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
      {tab === "completed" ? (
        <p className="m-0 flex items-center gap-3.5 rounded-lg bg-ink-50 p-4 text-[13px] font-bold text-ink-600">
          <span aria-hidden className="text-xl">
            💡
          </span>
          Un parcours passe dans « Terminés » quand toutes ses missions et ses évaluations sommatives sont réussies : ta
          certification est alors générée (cela peut prendre quelques minutes).
        </p>
      ) : (
        <p className="m-0 text-center text-[13px] font-bold text-ink-600">
          Envie d&apos;un nouveau défi ?{" "}
          <Link href={routes.learner.catalog} className="font-black text-primary-600 hover:underline">
            Explorer le catalogue
          </Link>
        </p>
      )}
    </>
  );
}

/** Squelette de WD23 : onglets et 3 cartes. */
export function MyCoursesSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Chargement de tes parcours…" className="flex flex-col gap-4.5">
      <SkeletonBlock className="h-10 w-60 rounded-pill" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-4.5 rounded-[20px] border-[1.5px] border-ink-100 p-4">
          <SkeletonBlock className="size-20 rounded-2xl sm:size-28" />
          <div className="flex flex-1 flex-col gap-2.5 pt-1">
            <SkeletonBlock className="h-5 w-24 rounded-pill" />
            <SkeletonBlock className="h-5 w-1/2" />
            <SkeletonBlock className="h-2.5 w-2/5 rounded-pill" />
            <SkeletonBlock className="h-3.5 w-3/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
