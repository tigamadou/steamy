import { CourseGrid } from "@/components/public/catalog";
import { getStarterCourses } from "@/lib/catalog";
import { routes } from "@/lib/routes";

/** Trois parcours gratuits de difficulté débutant, lus dans le catalogue public (client anonyme, en cache). */
export async function StarterSuggestions() {
  const courses = await getStarterCourses();
  if (courses.length === 0) {
    return (
      <p className="m-0 text-sm font-semibold text-ink-600">
        Aucun parcours gratuit pour débutant n&apos;est publié pour le moment : explore tout le catalogue.
      </p>
    );
  }
  return <CourseGrid courses={courses} courseHref={routes.learner.catalogCourse} />;
}

