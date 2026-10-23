import { Button, Mascot, SkeletonBlock } from "@/components/ds";
import { routes } from "@/lib/routes";

import { getSupervisedCourses, type SupervisedCourse } from "./api";
import { SupervisedCourseCard } from "./SupervisedCourseCard";

/** Aucun parcours encadré : il vient avec la première classe. */
export function NoSupervisedCourse() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[18px] border-2 border-dashed border-primary-300 bg-primary-50 px-5 py-8 text-center">
      <Mascot pose="idle" size={110} />
      <p className="m-0 max-w-120 text-sm font-semibold text-ink-700">
        Vous n&apos;encadrez aucun parcours pour l&apos;instant. Créez une classe : son parcours apparaîtra ici.
      </p>
      <Button href={routes.teacher.newClassroom} icon="plus">
        Créer une classe
      </Button>
    </div>
  );
}

/** WT02 · contenu, une fois les parcours lus. */
export function TeacherCoursesView({ courses }: { courses: SupervisedCourse[] }) {
  if (courses.length === 0) return <NoSupervisedCourse />;
  return (
    <ul aria-label="Mes parcours encadrés" className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => (
        <li key={course.slug} className="flex flex-col">
          <SupervisedCourseCard course={course} />
        </li>
      ))}
    </ul>
  );
}

/** WT02 · mes parcours encadrés : ceux de mes classes seulement (D62, D64), lus côté serveur. */
export async function TeacherCourses() {
  const courses = await getSupervisedCourses();
  return courses && <TeacherCoursesView courses={courses} />;
}

/** Squelette de WT02 : trois cartes de parcours. */
export function TeacherCoursesSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Chargement de vos parcours…"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <SkeletonBlock className="h-52 rounded-[22px]" />
      <SkeletonBlock className="h-52 rounded-[22px]" />
      <SkeletonBlock className="hidden h-52 rounded-[22px] lg:block" />
    </div>
  );
}
