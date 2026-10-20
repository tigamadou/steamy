import { notFound } from "next/navigation";
import { connection } from "next/server";

import { Breadcrumb, SkeletonBlock } from "@/components/ds";
import { getCourse } from "@/lib/catalog";
import { routes } from "@/lib/routes";

import { KitCodeForm } from "./KitCodeForm";

/** WA01 / WA06 · Fiche du parcours (en cache) pour le fil d'Ariane, puis le formulaire. Parcours inconnu → 404. */
export async function KitCodeView({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await connection();
  const course = await getCourse(slug);
  if (!course) notFound();
  return (
    <div className="mx-auto flex w-full max-w-140 flex-col gap-3">
      <Breadcrumb
        items={[
          { label: "Catalogue", href: routes.learner.catalog },
          { label: course.title, href: routes.learner.catalogCourse(course.slug) },
          { label: "Code Kit" },
        ]}
      />
      <KitCodeForm courseSlug={course.slug} />
    </div>
  );
}

/** Squelette de WA01 : fil d'Ariane et carte du formulaire. */
export function KitCodeSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Chargement…" className="mx-auto flex w-full max-w-140 flex-col gap-3">
      <SkeletonBlock className="h-4 w-64" />
      <SkeletonBlock className="h-96 rounded-[22px]" />
    </div>
  );
}
