import Link from "next/link";
import type { CSSProperties } from "react";

import { Badge, Icon } from "@/components/ds";
import { DIFFICULTY_LABELS } from "@/lib/format";
import { routes } from "@/lib/routes";

import type { SupervisedCourse } from "./api";

/** « 2 classes · 18 élèves » : effectifs lus dans l'API. */
export function supervisionLabel({ classroomCount, learnerCount }: Pick<SupervisedCourse, "classroomCount" | "learnerCount">): string {
  const classes = `${classroomCount} classe${classroomCount > 1 ? "s" : ""}`;
  const learners = `${learnerCount} élève${learnerCount > 1 ? "s" : ""}`;
  return `${classes} · ${learners}`;
}

/** Carte d'un parcours encadré (WT02) : visuel, difficulté, classes et élèves ; toute la carte mène à WT10. */
export function SupervisedCourseCard({ course }: { course: SupervisedCourse }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[22px] border-2 border-ink-100 bg-surface focus-within:border-primary-200 hover:border-primary-200">
      <div
        className="flex aspect-16/7 items-center justify-center bg-(--card-color)"
        style={{ "--card-color": course.category.color } as CSSProperties}
      >
        <span aria-hidden className="text-[52px] drop-shadow-md">
          {course.emoji}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4.5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="primary">{course.category.label}</Badge>
          <Badge>{DIFFICULTY_LABELS[course.difficulty]}</Badge>
        </div>
        <h2 className="m-0 text-base font-black text-ink-900">
          <Link
            href={routes.teacher.course(course.slug)}
            className="after:absolute after:inset-0 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
          >
            {course.title}
          </Link>
        </h2>
        <p className="m-0 flex items-center gap-1.5 text-[13px] font-bold text-ink-700">
          <Icon name="user" size={14} />
          {supervisionLabel(course)}
        </p>
      </div>
    </article>
  );
}
