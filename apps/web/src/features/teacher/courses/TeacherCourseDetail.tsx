import { Badge, Breadcrumb, SkeletonBlock } from "@/components/ds";
import { formatHours } from "@/features/learning/format";
import { DIFFICULTY_LABELS, formatMinutes } from "@/lib/format";
import { routes } from "@/lib/routes";

import { getSupervisedCourse, type SupervisedCourseDetail } from "./api";
import { CourseInsights } from "./CourseInsights";
import { MissionCompletionItem } from "./MissionCompletionItem";
import { supervisionLabel } from "./SupervisedCourseCard";

/** WT10 · contenu (numéros dans l'ordre de l'API) : en-tête, arbre Projet → Niveau → Mission en lecture seule, panneau de suivi. */
export function TeacherCourseDetailView({ course }: { course: SupervisedCourseDetail }) {
  const { slug } = course;
  return (
    <div className="flex flex-col gap-5">
      <Breadcrumb items={[{ label: "Mes parcours", href: routes.teacher.courses }, { label: course.title }]} />
      <header className="flex items-center gap-4 rounded-[22px] border-2 border-ink-100 bg-surface p-5">
        <span
          aria-hidden
          className="flex size-16 shrink-0 items-center justify-center rounded-[18px] text-3xl"
          style={{ background: course.category.color }}
        >
          {course.emoji}
        </span>
        <div className="min-w-0">
          <h2 className="m-0 text-xl leading-tight font-black text-ink-900">{course.title}</h2>
          <p className="m-0 mt-1 flex flex-wrap items-center gap-2 text-[13px] font-bold text-ink-700">
            <Badge tone="primary">{course.category.label}</Badge>
            <Badge>{DIFFICULTY_LABELS[course.difficulty]}</Badge>
            <span>{formatHours(course.durationHours)}</span>
            <span>· {supervisionLabel(course)}</span>
          </p>
          {course.description && <p className="m-0 mt-2 text-sm font-semibold text-ink-700">{course.description}</p>}
        </div>
      </header>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-labelledby="contenu-parcours" className="flex min-w-0 flex-col gap-5">
          <h2 id="contenu-parcours" className="m-0 text-lg font-black tracking-[-0.01em] text-ink-900">
            Contenu du parcours
          </h2>
          {course.projects.map((project, projectIndex) => (
            <section key={project.id} aria-labelledby={`projet-${project.id}`} className="flex flex-col gap-3">
              <h3 id={`projet-${project.id}`} className="m-0 text-base font-black text-ink-900">
                Projet {projectIndex + 1} · {project.title}
              </h3>
              {project.levels.map((level, levelIndex) => (
                <section key={level.id} aria-labelledby={`niveau-${level.id}`} className="flex flex-col gap-2">
                  <h4 id={`niveau-${level.id}`} className="m-0 text-sm font-extrabold text-ink-800">
                    Niveau {levelIndex + 1} · {level.title}
                    {level.durationMin !== undefined && (
                      <span className="font-semibold text-ink-600"> · {formatMinutes(level.durationMin)}</span>
                    )}
                  </h4>
                  <ul className="m-0 flex list-none flex-col gap-2 p-0">
                    {level.missions.map((mission, missionIndex) => (
                      <li key={mission.id}>
                        <MissionCompletionItem
                          step={`Mission ${missionIndex + 1}`}
                          title={mission.title}
                          durationMin={mission.durationMin ?? 0}
                          icon={mission.icon}
                          completedCount={mission.completedCount}
                          href={routes.teacher.mission(slug, mission.id)}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </section>
          ))}
        </section>
        <aside aria-label="Suivi du parcours">
          <CourseInsights course={course} />
        </aside>
      </div>
    </div>
  );
}

/** WT10 · détail d'un parcours encadré, lu côté serveur ; un parcours non encadré est introuvable (404). */
export async function TeacherCourseDetail({ params }: { params: Promise<{ slug: string }> }) {
  const course = await getSupervisedCourse((await params).slug);
  return course && <TeacherCourseDetailView course={course} />;
}

/** Squelette de WT10 : fil, en-tête, arbre et panneau. */
export function TeacherCourseDetailSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Chargement du parcours…" className="flex flex-col gap-5">
      <SkeletonBlock className="h-5 w-48 rounded-sm" />
      <SkeletonBlock className="h-28 rounded-[22px]" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-2">
          <SkeletonBlock className="h-18 rounded-lg" />
          <SkeletonBlock className="h-18 rounded-lg" />
          <SkeletonBlock className="h-18 rounded-lg" />
        </div>
        <SkeletonBlock className="h-72 rounded-[18px]" />
      </div>
    </div>
  );
}
