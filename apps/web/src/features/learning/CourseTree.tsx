import { Breadcrumb } from "@/components/ds/Breadcrumb";
import { SkeletonBlock } from "@/components/ds/SkeletonBlock";
import { getServerApi } from "@/lib/api";
import { routes } from "@/lib/routes";

import { readContent } from "./content";
import { CourseHeader } from "./CourseHeader";
import { LockedContentState } from "./LockedContentState";
import { ProjectAccordion } from "./ProjectAccordion";
import { projectCounts } from "./tree";

function plural(count: number, one: string, many: string): string {
  return `${count} ${count > 1 ? many : one}`;
}

/** WC06a/b · Arbre du parcours (`learning/enrollments/{slug}/tree/`), statuts tels que l'API les renvoie. */
export async function CourseTree({ slug, expandedProjectId }: { slug: string; expandedProjectId: number | null }) {
  const api = await getServerApi();
  const content = readContent(
    await api.GET("/api/learning/enrollments/{course_slug}/tree/", { params: { path: { course_slug: slug } } }),
  );
  if (!content.ok) return <LockedContentState code={content.code} courseSlug={slug} />;
  const tree = content.data;
  const counts = projectCounts(tree.projects);
  return (
    <div className="flex flex-col gap-5">
      <Breadcrumb items={[{ label: "Mes parcours", href: routes.learner.courses }, { label: tree.course.title }]} />
      <CourseHeader tree={tree} />
      <section aria-labelledby="ton-parcours" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="ton-parcours" className="m-0 text-lg font-black text-ink-900">
            Ton parcours · {plural(tree.projects.length, "projet", "projets")}
          </h2>
          <p className="m-0 text-[13px] font-bold text-ink-600">
            {plural(counts.done, "terminé", "terminés")} · {counts.available} en cours ·{" "}
            {plural(counts.locked, "verrouillé", "verrouillés")}
          </p>
        </div>
        {tree.projects.map((project) => (
          <ProjectAccordion
            key={project.id}
            courseSlug={slug}
            project={project}
            next={tree.next}
            expanded={project.id === expandedProjectId}
          />
        ))}
      </section>
    </div>
  );
}

/** Squelette de WC06 : fil d'Ariane, en-tête, projets. */
export function CourseTreeSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Chargement de ton parcours…" className="flex flex-col gap-5">
      <SkeletonBlock className="h-4 w-56" />
      <SkeletonBlock className="h-32 rounded-[18px]" />
      {[0, 1, 2].map((i) => (
        <SkeletonBlock key={i} className="h-20 rounded-xl" />
      ))}
    </div>
  );
}
