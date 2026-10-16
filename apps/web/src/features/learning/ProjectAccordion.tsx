import type { Schemas } from "@steamy/api-client";
import Link from "next/link";

import { Icon } from "@/components/ds/Icon";
import { MissionItem } from "@/components/ds/MissionItem";
import { cx } from "@/lib/cx";
import { routes } from "@/lib/routes";

import { formatHours, formatMinutes, position } from "./format";
import { displayState, isNextStep, quizStep } from "./tree";

export type ProjectAccordionProps = {
  courseSlug: string;
  project: Schemas["TreeProject"];
  next: Schemas["NextStep"];
  expanded: boolean;
};

const STATUS: Record<Schemas["StateEnum"], string> = {
  done: "Terminé",
  available: "En cours",
  locked: "Verrouillé",
};

// WC06a/WC06b · Projet du parcours, déplié par `?projet=<id>` (lien partageable). Verrouillé : ni lien ni focus.
export function ProjectAccordion({ courseSlug, project, next, expanded }: ProjectAccordionProps) {
  const locked = project.state === "locked";
  const open = expanded && !locked;
  const panelId = `projet-${project.id}-etapes`;
  const head = (
    <>
      <span
        aria-hidden
        className={cx(
          "flex size-11 shrink-0 items-center justify-center rounded-md text-lg font-black",
          project.state === "done" && "bg-success-500 text-white",
          project.state === "available" && "bg-primary-500 text-white",
          locked && "bg-ink-100 text-ink-500",
        )}
      >
        {project.state === "done" ? (
          <Icon name="check" size={20} strokeWidth={3} />
        ) : locked ? (
          <Icon name="lock" size={18} />
        ) : (
          position(project)
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-extrabold tracking-[.04em] text-ink-600 uppercase">
          Projet {position(project)}
        </span>
        <span className="mt-0.5 block text-base font-extrabold text-ink-900">{project.title}</span>
        <span className="mt-1 flex flex-wrap gap-2 text-xs font-bold text-ink-600">
          <span>⏱ {formatHours(project.durationHours)}</span>
          <span className={cx(project.state === "done" && "text-success-700", project.state === "available" && "text-primary-600")}>
            · {STATUS[project.state]} · {project.missionsDone}/{project.missionCount} missions
          </span>
        </span>
      </span>
      {locked ? (
        <Icon name="lock" size={18} className="text-ink-400" />
      ) : (
        <Icon name="chevron-down" size={18} className={cx("text-ink-400 transition-transform", open && "rotate-180")} />
      )}
    </>
  );
  const headClasses = "flex w-full items-center gap-3.5 p-4 text-left";

  return (
    <section
      aria-labelledby={`projet-${project.id}`}
      className={cx(
        "rounded-xl border-[1.5px] bg-surface",
        project.state === "available" ? "border-primary-300 shadow-pop-sm" : "border-ink-100",
        locked && "bg-ink-50",
      )}
    >
      <h3 id={`projet-${project.id}`} className="m-0">
        {locked ? (
          <div aria-disabled className={cx(headClasses, "cursor-not-allowed")}>
            {head}
          </div>
        ) : (
          <Link
            href={open ? routes.learner.course(courseSlug) : `${routes.learner.course(courseSlug)}?projet=${project.id}`}
            scroll={false}
            aria-expanded={open}
            aria-controls={panelId}
            className={cx(
              headClasses,
              "rounded-xl hover:bg-ink-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-500",
            )}
          >
            {head}
          </Link>
        )}
      </h3>
      {open && (
        <div id={panelId} className="flex flex-col gap-4 border-t border-ink-100 px-4 pt-3 pb-4">
          <Link
            href={routes.learner.project(courseSlug, project.id)}
            className="self-start rounded-sm text-[13px] font-black text-primary-600 hover:underline focus-visible:outline-3 focus-visible:outline-primary-500"
          >
            Voir le projet {position(project)} ›
          </Link>
          {project.levels.map((level) => (
            <div key={level.id} className="flex flex-col gap-2">
              <h4 className="m-0 text-sm font-black text-ink-700">
                {level.state === "locked" ? (
                  <>
                    Niveau {position(level)} · {level.title}
                  </>
                ) : (
                  <Link
                    href={routes.learner.level(courseSlug, level.id)}
                    className="rounded-sm hover:text-primary-600 focus-visible:outline-3 focus-visible:outline-primary-500"
                  >
                    Niveau {position(level)} · {level.title}
                  </Link>
                )}
              </h4>
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {level.missions.map((mission) => (
                  <li key={mission.id}>
                    <MissionItem
                      step={`Mission ${position(mission)}`}
                      title={mission.title}
                      duration={formatMinutes(mission.durationMin)}
                      icon={mission.icon}
                      state={displayState(mission.state, isNextStep(next, "mission", mission.id))}
                      href={routes.learner.mission(courseSlug, mission.id)}
                    />
                  </li>
                ))}
                {level.quiz && (
                  <li>
                    <MissionItem
                      step={quizStep(level.quiz.kind)}
                      title={level.quiz.title}
                      icon="📝"
                      state={displayState(level.quiz.state, isNextStep(next, "quiz", level.quiz.id))}
                      href={routes.learner.quiz(courseSlug, level.quiz.id)}
                    />
                  </li>
                )}
              </ul>
            </div>
          ))}
          {project.quiz && (
            <MissionItem
              step={quizStep(project.quiz.kind)}
              title={project.quiz.title}
              icon="🏁"
              state={displayState(project.quiz.state, isNextStep(next, "quiz", project.quiz.id))}
              href={routes.learner.quiz(courseSlug, project.quiz.id)}
            />
          )}
        </div>
      )}
    </section>
  );
}
