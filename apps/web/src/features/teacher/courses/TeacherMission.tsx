import type { Schemas } from "@steamy/api-client";

import { Breadcrumb, Button, SkeletonBlock } from "@/components/ds";
import { position } from "@/features/learning/format";
import { LessonVideo } from "@/features/learning/LessonVideo";
import { MissionBlocks } from "@/features/learning/MissionBlocks";
import { formatMinutes } from "@/lib/format";
import { routes } from "@/lib/routes";

import { getSupervisedCourse, getSupervisedMission } from "./api";

/** Blocs de contenu d'une mission : l'API les type en JSON libre, la liste vide tient lieu de contenu absent. */
export function missionBlocks(blocks: unknown): Schemas["MissionBlock"][] {
  return Array.isArray(blocks) ? (blocks as Schemas["MissionBlock"][]) : [];
}

/**
 * Mission en lecture seule (WT10) : la vidéo et le contenu de l'apprenant, sans progression, sans quiz et sans suivi
 * du visionnage (aucune activité d'apprentissage n'est créée par l'enseignant).
 */
export function TeacherMissionView({
  slug,
  courseTitle,
  mission,
}: {
  slug: string;
  courseTitle: string;
  mission: Schemas["MissionRead"];
}) {
  return (
    <div className="flex flex-col gap-5">
      <Breadcrumb
        items={[
          { label: "Mes parcours", href: routes.teacher.courses },
          { label: courseTitle, href: routes.teacher.course(slug) },
          { label: `Mission ${position(mission)}` },
        ]}
      />
      <article
        aria-labelledby="mission-titre"
        className="flex flex-col gap-5 rounded-[22px] border-2 border-ink-100 bg-surface p-5 sm:p-6"
      >
        <header className="flex items-center gap-3.5">
          <span aria-hidden className="flex size-14 shrink-0 items-center justify-center rounded-[18px] bg-primary-100 text-2xl">
            {mission.icon || "🤖"}
          </span>
          <div className="min-w-0">
            <p className="m-0 text-xs font-extrabold tracking-[.06em] text-ink-600 uppercase">
              {mission.project.title} · {mission.level.title} · ⏱ {formatMinutes(mission.durationMin)}
            </p>
            <h2 id="mission-titre" className="m-0 text-2xl leading-tight font-black text-ink-900">
              {mission.title}
            </h2>
          </div>
        </header>
        {mission.vimeoId && <LessonVideo vimeoId={mission.vimeoId} vimeoHash={mission.vimeoHash} title={mission.title} />}
        <MissionBlocks blocks={missionBlocks(mission.blocks)} />
      </article>
      <div>
        <Button href={routes.teacher.course(slug)} variant="outline" icon="arrow-left">
          Retour au parcours
        </Button>
      </div>
    </div>
  );
}

/** Mission d'un parcours encadré, lue côté serveur ; une mission hors des parcours de l'enseignant est introuvable. */
export async function TeacherMission({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const [course, mission] = await Promise.all([getSupervisedCourse(slug), getSupervisedMission(slug, id)]);
  return course && mission && <TeacherMissionView slug={slug} courseTitle={course.title} mission={mission} />;
}

/** Squelette de la mission : fil, contenu. */
export function TeacherMissionSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Chargement de la mission…" className="flex flex-col gap-5">
      <SkeletonBlock className="h-5 w-64 rounded-sm" />
      <SkeletonBlock className="h-96 rounded-[22px]" />
    </div>
  );
}
