import type { Metadata } from "next";
import { Suspense } from "react";

import { CourseDetailSkeleton } from "@/components/public/course-detail";
import { CourseView } from "@/components/public/course-sections";
import { AppStateBoundary } from "@/components/states";
import { getCourse } from "@/lib/catalog";
import { routes } from "@/lib/routes";

export async function generateMetadata({ params }: PageProps<"/parcours/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourse(slug).catch(() => null);
  if (!course) {
    return { title: "Parcours introuvable" };
  }
  return {
    title: course.title,
    description: course.description,
    alternates: { canonical: routes.course(course.slug) },
    openGraph: { type: "website", title: course.title, description: course.description },
  };
}

/** WL22 · Fiche parcours publique (D11) : plan sans contenu de mission, CTA visiteur avec retour. */
export default function CoursePage({ params }: PageProps<"/parcours/[slug]">) {
  return (
    <AppStateBoundary>
      <Suspense fallback={<CourseDetailSkeleton />}>
        <CourseView params={params} />
      </Suspense>
    </AppStateBoundary>
  );
}
