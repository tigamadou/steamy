import type { Schemas } from "@steamy/api-client";

import { CourseCard } from "@/components/ds";
import { toCourseCard } from "@/lib/format";
import { routes } from "@/lib/routes";

export const GRID = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";

/** Grille de cartes parcours vers leur fiche dans l'espace apprenant (WC04). */
export function CourseGrid({ courses }: { courses: Schemas["CourseList"][] }) {
  return (
    <ul className={GRID}>
      {courses.map((course) => (
        <li key={course.slug} className="flex">
          <CourseCard course={toCourseCard(course, routes.learner.catalogCourse)} className="flex-1" />
        </li>
      ))}
    </ul>
  );
}

