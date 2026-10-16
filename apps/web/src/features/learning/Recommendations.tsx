import type { Schemas } from "@steamy/api-client";

import { CourseCard } from "@/components/ds/CourseCard";
import { SectionHeader } from "@/components/ds/SectionHeader";
import { DIFFICULTY_LABELS, formatPrice } from "@/lib/format";
import { routes } from "@/lib/routes";

/** Recommandations de l'API (`learning/recommendations/`) en cartes vers la fiche du catalogue ; absentes si vides. */
export function Recommendations({ id, title, items }: { id: string; title: string; items: Schemas["Recommendation"][] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <SectionHeader id={id} title={title} action={{ label: "Voir tout", href: routes.learner.catalog }} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((course) => (
          <CourseCard
            key={course.slug}
            course={{
              href: routes.learner.catalogCourse(course.slug),
              title: course.title,
              difficulty: DIFFICULTY_LABELS[course.difficulty],
              isFree: course.isFree ?? false,
              priceLabel: formatPrice(course.price ?? 0),
              color: course.category.color,
              emoji: course.emoji || course.category.icon,
            }}
          />
        ))}
      </div>
    </section>
  );
}
