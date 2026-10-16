import { notFound } from "next/navigation";
import { connection } from "next/server";

import { Breadcrumb, Icon } from "@/components/ds";
import { stringList } from "@/components/public/course-detail";
import { getCourse } from "@/lib/catalog";
import { learnerCatalogHref } from "@/lib/catalog-filters";
import { routes } from "@/lib/routes";
import { getKit } from "@/lib/shop";

import { CourseHero, Curriculum, DetailSection } from "./course-detail";
import { EnrollCard } from "./EnrollCard";
import { DegradedNotice } from "./DegradedNotice";
import { getLearnerCourseState } from "./learner-state";

/**
 * WC04 / WC05 · Fiche parcours de l'apprenant, sous `<Suspense>` : fiche publique (en cache, sans contenu de
 * mission), kit requis lu dans la boutique, puis souhaits et inscription de l'apprenant. Un parcours non publié
 * répond 404.
 */
export async function LearnerCourseView({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await connection();
  const [course, state] = await Promise.all([getCourse(slug), getLearnerCourseState()]);
  if (!course) {
    notFound();
  }
  // Boutique en panne : la fiche s'affiche sans le bloc « Kit requis »
  const kit = course.requiredKit ? await getKit(course.requiredKit.slug).catch(() => null) : null;
  const outcomes = stringList(course.outcomes);

  return (
    <>
      {state.degraded && <DegradedNotice />}
      <Breadcrumb
        className="mb-3"
        items={[
          { label: "Catalogue", href: routes.learner.catalog },
          { label: course.category.label, href: learnerCatalogHref({ category: course.category.slug }) },
          { label: course.title },
        ]}
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_308px]">
        <div className="min-w-0">
          <CourseHero course={course} />
          <DetailSection title="À propos du parcours">
            <p className="text-sm leading-relaxed font-medium text-ink-700">{course.description}</p>
          </DetailSection>
          {outcomes.length > 0 && (
            <DetailSection title="Ce que tu vas apprendre">
              <ul className="grid gap-x-4 gap-y-2.5 sm:grid-cols-2">
                {outcomes.map((outcome) => (
                  <li key={outcome} className="flex items-start gap-2.5 text-[13px] leading-snug font-bold text-ink-800">
                    <span
                      aria-hidden
                      className="flex size-5.5 shrink-0 items-center justify-center rounded-pill bg-success-100 text-success-700"
                    >
                      <Icon name="check" size={12} strokeWidth={3} />
                    </span>
                    {outcome}
                  </li>
                ))}
              </ul>
            </DetailSection>
          )}
          <Curriculum course={course} />
          {course.audience && (
            <DetailSection title="Public visé">
              <p className="text-sm leading-relaxed font-medium text-ink-700">{course.audience}</p>
            </DetailSection>
          )}
        </div>
        <EnrollCard
          course={course}
          progress={state.progress[course.slug]}
          wished={state.wished.includes(course.slug)}
          kit={kit}
        />
      </div>
    </>
  );
}
