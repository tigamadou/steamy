import type { Schemas } from "@steamy/api-client";
import type { CSSProperties, ReactNode } from "react";

import { Accordion, Badge, Icon, SkeletonBlock, VimeoPlayer } from "@/components/ds";
import { offerOf, plural } from "@/components/public/course-detail";
import { DIFFICULTY_LABELS, formatMinutes, formatPrice, KIT_CODE_LABEL } from "@/lib/format";

// Fiche parcours de l'apprenant (WC04, WC05) : en-tête, sections, programme. Le h1 est le titre du shell
// (« Catalogue ») : le titre du parcours est un h2, les sections des h3.

type Course = Schemas["CourseDetail"];

export function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h3 className="mb-3 text-lg font-black text-ink-900">{title}</h3>
      {children}
    </section>
  );
}

/** En-tête : catégorie, titre, difficulté, durée, offre ; bande-annonce Vimeo si l'API en fournit une. Pas de note (C8). */
export function CourseHero({ course }: { course: Course }) {
  const offer = offerOf(course);
  const emoji = course.emoji || course.category.icon;
  return (
    <div
      className="relative flex flex-col gap-5 overflow-hidden rounded-[22px] bg-(--course) p-5 text-white sm:p-6 lg:flex-row lg:items-center"
      style={{ "--course": course.category.color } as CSSProperties}
    >
      {/* Voile sombre : texte blanc lisible (AA) quelle que soit la couleur de la catégorie */}
      <span aria-hidden className="absolute inset-0 bg-ink-900/45" />
      <div className="relative flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-xs font-extrabold tracking-[0.08em] uppercase">{course.category.label}</p>
        <h2 className="text-[24px] leading-tight font-black sm:text-[26px]">{course.title}</h2>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] font-bold">
          <li className="inline-flex items-center gap-1.5">
            <Icon name="trophy" size={14} />
            <span className="sr-only">Difficulté :</span> {DIFFICULTY_LABELS[course.difficulty]}
          </li>
          {!!course.durationHours && <li>⏱ {course.durationHours} h environ</li>}
          {course.certificateEnabled && <li>📜 Certification</li>}
        </ul>
        <div className="mt-1">
          {offer === "kit" ? (
            <Badge tone="amber">📦 {KIT_CODE_LABEL}</Badge>
          ) : offer === "free" ? (
            <Badge tone="success">Gratuit</Badge>
          ) : (
            <Badge tone="amber">{formatPrice(course.price ?? 0)}</Badge>
          )}
        </div>
      </div>
      {course.trailerVimeoId ? (
        <div className="relative flex w-full shrink-0 flex-col items-center gap-2 lg:w-70">
          <VimeoPlayer
            vimeoId={course.trailerVimeoId}
            vimeoHash={course.trailerVimeoHash || undefined}
            title={`Bande-annonce : ${course.title}`}
            playLabel="Lire la bande-annonce"
            poster={emoji}
            color={course.category.color}
            className="shadow-pop-md"
          />
          <p className="text-[11px] font-extrabold tracking-[0.06em] uppercase">Bande-annonce</p>
        </div>
      ) : (
        <span
          aria-hidden
          className="relative flex h-32 w-full shrink-0 items-center justify-center rounded-[16px] bg-white/20 text-[64px] lg:w-56"
        >
          {emoji}
        </span>
      )}
    </div>
  );
}

/** Programme : projets → niveaux → missions, titres et durées seulement (D11). */
export function Curriculum({ course }: { course: Course }) {
  return (
    <DetailSection title={`Programme · ${plural(course.projects.length, "projet")}`}>
      <div className="flex flex-col gap-2">
        {course.projects.map((project, index) => {
          const missions = project.levels.reduce((n, level) => n + level.missions.length, 0);
          return (
            <Accordion
              key={`${project.order}-${project.title}`}
              defaultOpen={index === 0}
              title={
                <span className="flex flex-1 items-center gap-3">
                  <span
                    aria-hidden
                    className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-primary-100 text-xs font-extrabold text-primary-700"
                  >
                    {index + 1}
                  </span>
                  <span className="flex flex-1 flex-col">
                    <span className="sr-only">Projet {index + 1} :</span>
                    <span className="text-sm font-extrabold">{project.title}</span>
                    <span className="text-xs font-bold text-ink-600">
                      {project.durationHours ? `${project.durationHours} h · ` : ""}
                      {plural(missions, "mission")}
                    </span>
                  </span>
                </span>
              }
            >
              <div className="flex flex-col gap-3">
                {project.levels.map((level, levelIndex) => (
                  <div key={`${level.order}-${level.title}`}>
                    <h4 className="mb-1 text-[13px] font-black text-primary-700">
                      Niveau {levelIndex + 1} · {level.title}
                    </h4>
                    <ul>
                      {level.missions.map((mission) => (
                        <li
                          key={`${mission.order}-${mission.title}`}
                          className="flex items-center gap-3 rounded-[10px] px-2 py-1.5 text-[13px] font-bold text-ink-800"
                        >
                          <span
                            aria-hidden
                            className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-primary-100 text-primary-600"
                          >
                            <Icon name="video" size={14} />
                          </span>
                          <span className="flex-1">{mission.title}</span>
                          {!!mission.durationMin && (
                            <span className="font-mono text-xs text-ink-600">{formatMinutes(mission.durationMin)}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Accordion>
          );
        })}
      </div>
    </DetailSection>
  );
}

/** Chargement de WC04 : silhouette de la fiche et de la carte d'inscription. */
export function CourseDetailSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Chargement du parcours…">
      <SkeletonBlock className="mb-3 h-3.5 w-64" />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_308px]">
        <div className="flex flex-col gap-4">
          <SkeletonBlock className="h-52 rounded-[22px]" />
          <SkeletonBlock className="h-5 w-56" />
          <SkeletonBlock className="h-3.5" />
          <SkeletonBlock className="h-14 rounded-[14px]" />
          <SkeletonBlock className="h-14 rounded-[14px]" />
        </div>
        <SkeletonBlock className="h-96 rounded-[22px]" />
      </div>
    </div>
  );
}
