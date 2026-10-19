import { Breadcrumb } from "@/components/ds/Breadcrumb";
import { Button } from "@/components/ds/Button";
import { MissionItem } from "@/components/ds/MissionItem";
import { getServerApi } from "@/lib/api";
import { routes } from "@/lib/routes";
import { formatMinutes } from "@/lib/format";

import { readContent } from "./content";
import { position } from "./format";
import { LessonVideo } from "./LessonVideo";
import { LockedContentState } from "./LockedContentState";

// WJ02 · Niveau : vidéo d'introduction (si fournie), résumé, missions et entrée dans la mission à faire.
export async function LevelView({ slug, levelId }: { slug: string; levelId: number }) {
  const api = await getServerApi();
  const [levelResult, treeResult] = await Promise.all([
    api.GET("/api/learning/levels/{id}/", { params: { path: { id: levelId } } }),
    api.GET("/api/learning/enrollments/{course_slug}/tree/", { params: { path: { course_slug: slug } } }),
  ]);
  const content = readContent(levelResult);
  if (!content.ok) return <LockedContentState code={content.code} courseSlug={slug} />;
  const level = content.data;
  const { course } = level;
  // Mission en cours : l'étape suivante renvoyée par l'API (`next`), jamais déduite des états
  const next = treeResult.data?.next;
  const todo = next?.type === "mission" ? level.missions.find((mission) => mission.id === next.id) : undefined;
  const started = level.missions.some((mission) => mission.state === "done");
  return (
    <div className="flex flex-col gap-5">
      <Breadcrumb
        items={[
          { label: "Mes parcours", href: routes.learner.courses },
          { label: course.title, href: routes.learner.course(course.slug) },
          { label: `Projet ${position(level.project)}`, href: routes.learner.project(course.slug, level.project.id) },
          { label: `Niveau ${position(level)}` },
        ]}
      />
      <header className="flex flex-col gap-2">
        <p className="m-0 text-xs font-extrabold tracking-[.06em] text-primary-600 uppercase">
          Niveau {position(level)} · ⏱ {formatMinutes(level.durationMin)}
        </p>
        <h2 className="m-0 text-[26px] leading-tight font-black text-ink-900">{level.title}</h2>
      </header>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-4">
          {level.introVimeoId && (
            <LessonVideo vimeoId={level.introVimeoId} vimeoHash={level.introVimeoHash} title={`Introduction : ${level.title}`} />
          )}
          {level.introSummary && (
            <p className="m-0 text-[15px] leading-relaxed font-semibold whitespace-pre-line text-ink-700">{level.introSummary}</p>
          )}
        </div>
        <section aria-labelledby="au-programme" className="flex flex-col gap-3">
          <h3 id="au-programme" className="m-0 text-lg font-black text-ink-900">
            Au programme de ce niveau
          </h3>
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            {level.missions.map((mission) => (
              <li key={mission.id}>
                <MissionItem
                  step={`Mission ${position(mission)}`}
                  title={mission.title}
                  duration={formatMinutes(mission.durationMin)}
                  icon={mission.icon}
                  state={mission.id === todo?.id ? "current" : mission.state}
                  href={routes.learner.mission(course.slug, mission.id)}
                />
              </li>
            ))}
          </ul>
          {todo ? (
            <Button href={routes.learner.mission(course.slug, todo.id)} variant="secondary" size="lg" icon="play" block>
              {started ? `Continuer la mission ${position(todo)}` : "Commencer la 1ʳᵉ mission"}
            </Button>
          ) : (
            <Button href={routes.learner.course(course.slug)} variant="outline" iconRight="arrow-right" block>
              Retour à mon parcours
            </Button>
          )}
        </section>
      </div>
    </div>
  );
}
