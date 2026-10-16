import type { Schemas } from "@steamy/api-client";

import { Button } from "@/components/ds/Button";
import { ProgressBar } from "@/components/ds/ProgressBar";

import { formatMinutes, position } from "./format";
import { nextStepHref, nextStepLabel } from "./next-step";
import { remainingMinutes } from "./tree";

// WC06a · En-tête compact du parcours suivi : catégorie, « Projet n sur N », progression, temps restant, reprise.
export function CourseHeader({ tree }: { tree: Schemas["Tree"] }) {
  const { course, currentProject, projects } = tree;
  const remaining = remainingMinutes(projects);
  return (
    <section
      aria-labelledby="parcours-titre"
      className="flex flex-col gap-4 rounded-[18px] bg-linear-135 from-primary-500 to-primary-700 px-5.5 py-4.5 text-white sm:flex-row sm:items-center sm:gap-5"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="m-0 text-[11px] font-extrabold tracking-[.08em] uppercase opacity-90">
          {course.category.label}
          {currentProject && ` · Projet ${position(currentProject)} sur ${projects.length}`}
        </p>
        <h2 id="parcours-titre" className="m-0 text-[22px] leading-tight font-black">
          {course.title}
        </h2>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <ProgressBar value={tree.progressPct} label={`Progression : ${course.title}`} tone="amber" inverse className="max-w-80 flex-1" />
          <span className="text-xs font-black">{tree.progressPct} %</span>
          {remaining > 0 && <span className="text-xs font-bold opacity-90">· {formatMinutes(remaining)} restant</span>}
        </div>
      </div>
      <Button href={nextStepHref(tree.next)} variant="amber" size="lg" icon="play" className="max-sm:w-full">
        {nextStepLabel(tree.next)}
      </Button>
    </section>
  );
}
