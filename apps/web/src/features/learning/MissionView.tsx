import { Breadcrumb } from "@/components/ds/Breadcrumb";
import { Button } from "@/components/ds/Button";
import { getServerApi } from "@/lib/api";
import { routes } from "@/lib/routes";

import { readContent } from "./content";
import { formatMinutes, position } from "./format";
import { LessonVideo } from "./LessonVideo";
import { LockedContentState } from "./LockedContentState";
import { MarkDoneButton } from "./MarkDoneButton";
import { MissionBlocks } from "./MissionBlocks";
import { nextStepHref, nextStepLabel } from "./next-step";

// WJ03 · Mission : vidéo (suivi du visionnage), contenu, « Marquer comme terminée » puis étape suivante de l'API.
export async function MissionView({ slug, missionId }: { slug: string; missionId: number }) {
  const api = await getServerApi();
  const content = readContent(await api.GET("/api/learning/missions/{id}/", { params: { path: { id: missionId } } }));
  if (!content.ok) return <LockedContentState code={content.code} courseSlug={slug} />;
  const mission = content.data;
  const { course } = mission;
  return (
    <div className="flex flex-col gap-5">
      <Breadcrumb
        items={[
          { label: "Mes parcours", href: routes.learner.courses },
          { label: course.title, href: routes.learner.course(course.slug) },
          { label: `Projet ${position(mission.project)}`, href: routes.learner.project(course.slug, mission.project.id) },
          { label: `Niveau ${position(mission.level)}`, href: routes.learner.level(course.slug, mission.level.id) },
          { label: `Mission ${position(mission)}` },
        ]}
      />
      <article aria-labelledby="mission-titre" className="flex flex-col gap-5 rounded-[22px] border-2 border-ink-100 bg-surface p-5 sm:p-6">
        <header className="flex items-center gap-3.5">
          <span aria-hidden className="flex size-14 shrink-0 items-center justify-center rounded-[18px] bg-primary-100 text-2xl">
            {mission.icon || "🤖"}
          </span>
          <div className="min-w-0">
            <p className="m-0 text-xs font-extrabold tracking-[.06em] text-ink-600 uppercase">
              Mission {position(mission)} · ⏱ {formatMinutes(mission.durationMin)}
            </p>
            <h2 id="mission-titre" className="m-0 text-2xl leading-tight font-black text-ink-900">
              {mission.title}
            </h2>
          </div>
        </header>
        {mission.vimeoId && (
          <LessonVideo vimeoId={mission.vimeoId} vimeoHash={mission.vimeoHash} title={mission.title} missionId={mission.id} />
        )}
        <MissionBlocks blocks={mission.blocks} />
      </article>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-start sm:justify-between">
        <Button href={routes.learner.level(course.slug, mission.level.id)} variant="outline" icon="arrow-left">
          Retour au niveau
        </Button>
        {mission.state === "done" ? (
          <div className="flex flex-col items-end gap-2">
            <p className="m-0 text-sm font-extrabold text-success-700">✓ Mission terminée</p>
            <Button href={nextStepHref(mission.next)} variant="secondary" iconRight="arrow-right">
              {nextStepLabel(mission.next)}
            </Button>
          </div>
        ) : (
          <MarkDoneButton missionId={mission.id} />
        )}
      </div>
    </div>
  );
}
