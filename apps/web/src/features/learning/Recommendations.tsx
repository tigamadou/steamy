import type { Schemas } from "@steamy/api-client";

import { SectionHeader } from "@/components/ds/SectionHeader";
import { CourseGrid } from "@/components/public/catalog";
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
      <CourseGrid courses={items} courseHref={routes.learner.catalogCourse} />
    </section>
  );
}
