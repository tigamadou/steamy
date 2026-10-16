import type { Schemas } from "@steamy/api-client";

import { CourseCard } from "@/components/ds/CourseCard";
import { SectionHeader } from "@/components/ds/SectionHeader";
import { toCourseCard } from "@/lib/format";
import { routes } from "@/lib/routes";

/**
 * Recommandations de l'API (`learning/recommendations/`) en cartes vers la fiche du catalogue (sans prix de parcours
 * pour un parcours à kit, D36) ; absentes si vides.
 */
export function Recommendations({ id, title, items }: { id: string; title: string; items: Schemas["Recommendation"][] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <SectionHeader id={id} title={title} action={{ label: "Voir tout", href: routes.learner.catalog }} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((course) => (
          <CourseCard key={course.slug} course={toCourseCard(course, routes.learner.catalogCourse(course.slug))} />
        ))}
      </div>
    </section>
  );
}
