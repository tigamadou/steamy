import type { Metadata } from "next";
import { Suspense } from "react";

import { Tabs } from "@/components/ds/Tabs";
import { MyCourses, MyCoursesSkeleton, type CoursesTab } from "@/features/learning/MyCourses";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Mes parcours" };

/** Onglet de l'URL (`?onglet=termines`), « En cours » par défaut. */
function tabOf(value: string | string[] | undefined): CoursesTab {
  return value === "termines" ? "completed" : "active";
}

// WD23 · Mes parcours (D39) : onglets En cours / Terminés, cartes lues dans `learning/enrollments/`.
export default async function MyCoursesPage({ searchParams }: PageProps<"/apprenant/parcours">) {
  const tab = tabOf((await searchParams).onglet);
  return (
    <div className="flex flex-col gap-4.5">
      <Suspense fallback={<MyCoursesSkeleton />}>
        <MyCourses tab={tab}>
          {(counts) => (
            <Tabs
              label="Mes parcours"
              activeHref={tab === "completed" ? `${routes.learner.courses}?onglet=termines` : routes.learner.courses}
              items={[
                { href: routes.learner.courses, label: `En cours (${counts.active})` },
                { href: `${routes.learner.courses}?onglet=termines`, label: `Terminés (${counts.completed})` },
              ]}
            />
          )}
        </MyCourses>
      </Suspense>
    </div>
  );
}
