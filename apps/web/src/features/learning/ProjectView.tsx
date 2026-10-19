import { Breadcrumb } from "@/components/ds/Breadcrumb";
import { Button } from "@/components/ds/Button";
import { MissionItem } from "@/components/ds/MissionItem";
import { ProgressBar } from "@/components/ds/ProgressBar";
import { SectionHeader } from "@/components/ds/SectionHeader";
import { getServerApi } from "@/lib/api";
import { cx } from "@/lib/cx";
import { routes } from "@/lib/routes";
import { formatMinutes } from "@/lib/format";

import { readContent } from "./content";
import { formatHours, position } from "./format";
import { InfoBlock } from "./InfoBlock";
import { LockedContentState } from "./LockedContentState";

// WJ01 · Projet : objectifs, prérequis, matériel, niveaux, progression et récompenses, lus dans l'API.
export async function ProjectView({ slug, projectId }: { slug: string; projectId: number }) {
  const api = await getServerApi();
  const [projectResult, treeResult] = await Promise.all([
    api.GET("/api/learning/projects/{id}/", { params: { path: { id: projectId } } }),
    api.GET("/api/learning/enrollments/{course_slug}/tree/", { params: { path: { course_slug: slug } } }),
  ]);
  const content = readContent(projectResult);
  if (!content.ok) return <LockedContentState code={content.code} courseSlug={slug} />;
  const project = content.data;
  const course = project.course;
  // Niveau en cours : celui de l'étape suivante renvoyée par l'API (`next`), jamais déduit des états
  const next = treeResult.data?.next;
  const current = next?.projectId === project.id ? project.levels.find((level) => level.id === next.levelId) : undefined;
  return (
    <div className="flex flex-col gap-5">
      <Breadcrumb
        items={[
          { label: "Mes parcours", href: routes.learner.courses },
          { label: course.title, href: routes.learner.course(course.slug) },
          { label: `Projet ${position(project)}` },
        ]}
      />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-5">
          <header className="flex flex-col gap-2">
            <p className="m-0 text-xs font-extrabold tracking-[.06em] text-primary-600 uppercase">
              Projet {position(project)} · ⏱ {formatHours(project.durationHours)}
            </p>
            <h2 className="m-0 text-[26px] leading-tight font-black text-ink-900">{project.title}</h2>
          </header>
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoBlock emoji="🎯" title="Objectifs" items={project.objectives} />
            <InfoBlock emoji="📚" title="Prérequis" items={project.prerequisites} />
            <InfoBlock emoji="🧰" title="Matériel" items={project.materials} />
          </div>
          <section aria-labelledby="niveaux-du-projet">
            <SectionHeader id="niveaux-du-projet" title="Les niveaux de ce projet" />
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              {project.levels.map((level) => (
                <li key={level.id}>
                  <MissionItem
                    step={`Niveau ${position(level)}`}
                    title={level.title}
                    duration={formatMinutes(level.durationMin)}
                    icon="🧩"
                    state={level.id === current?.id ? "current" : level.state}
                    href={routes.learner.level(course.slug, level.id)}
                  />
                </li>
              ))}
            </ul>
          </section>
        </div>
        <aside className="flex flex-col gap-4 lg:sticky lg:top-20">
          <section aria-labelledby="ta-progression" className="flex flex-col gap-3 rounded-[18px] border-2 border-ink-100 bg-surface p-4.5">
            <h3 id="ta-progression" className="m-0 text-base font-black text-ink-900">
              Ta progression
            </h3>
            <ProgressBar
              value={project.missionCount ? (project.missionsDone / project.missionCount) * 100 : 0}
              label={`Missions du projet ${position(project)}`}
              tone="success"
            />
            <p className="m-0 text-[13px] font-bold text-ink-600">
              {project.missionsDone} mission{project.missionsDone > 1 ? "s" : ""} terminée
              {project.missionsDone > 1 ? "s" : ""} sur {project.missionCount}
            </p>
            {current && (
              <Button href={routes.learner.level(course.slug, current.id)} icon="play" block>
                Continuer le niveau {position(current)}
              </Button>
            )}
          </section>
          <section aria-labelledby="recompenses" className="rounded-[18px] border-2 border-ink-100 bg-surface p-4.5">
            <h3 id="recompenses" className="m-0 mb-3 text-sm font-black text-ink-900">
              Récompenses du projet
            </h3>
            <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[13px] font-bold">
              {project.levels.map((level) => (
                <li key={level.id} className={cx("flex items-center gap-2", level.state === "done" ? "text-success-700" : "text-ink-600")}>
                  <span aria-hidden>{level.state === "done" ? "🏅" : "⚪"}</span>
                  Badge du niveau {position(level)}
                  {level.state === "done" && <span className="sr-only"> (obtenu)</span>}
                </li>
              ))}
              <li className={cx("flex items-center gap-2", project.state === "done" ? "text-success-700" : "text-ink-600")}>
                <span aria-hidden>{project.state === "done" ? "🏆" : "⚪"}</span>
                Badge du projet
                {project.state === "done" && <span className="sr-only"> (obtenu)</span>}
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
