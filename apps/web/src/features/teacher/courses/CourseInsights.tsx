import Link from "next/link";

import { ProgressBar } from "@/components/ds";
import { routes } from "@/lib/routes";

import type { SupervisedCourseDetail } from "./api";

/** Taux de réussite lu dans l'API (`null` sans tentative) : « 75 % » ou « Aucune tentative ». */
export function rateLabel(rate: number | null): string {
  return rate === null ? "Aucune tentative" : `${rate} %`;
}

type Weak = { key: string; label: string; kind: "Niveau" | "Projet"; rate: number };

/**
 * Niveaux (quiz formatifs) et projets (évaluations sommatives) les moins réussis : ceux dont le taux de l'API est
 * sous 100 %, du plus bas au plus haut. Le taux est celui du serveur, seul l'ordre d'affichage est établi ici.
 */
export function weakestSteps(projects: SupervisedCourseDetail["projects"], limit = 3): Weak[] {
  const steps: Weak[] = [];
  for (const project of projects) {
    if (project.passRate !== null) {
      steps.push({ key: `p${project.id}`, label: project.title, kind: "Projet", rate: project.passRate });
    }
    for (const level of project.levels) {
      if (level.passRate !== null) {
        steps.push({ key: `l${level.id}`, label: level.title, kind: "Niveau", rate: level.passRate });
      }
    }
  }
  return steps
    .filter((step) => step.rate < 100)
    .sort((a, b) => a.rate - b.rate)
    .slice(0, limit);
}

function Panel({ title, id, children }: { title: string; id: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3 rounded-[18px] border-[1.5px] border-ink-100 bg-surface p-4.5">
      <h2 id={id} className="m-0 text-base font-black text-ink-900">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Panneau de droite de WT10 : progression par classe, taux de réussite, niveaux et projets les plus échoués. */
export function CourseInsights({ course }: { course: SupervisedCourseDetail }) {
  const weakest = weakestSteps(course.projects);
  return (
    <div className="flex flex-col gap-4">
      <Panel id="progression-classes" title="Progression par classe">
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {course.classrooms.map((classroom) => (
            <li key={classroom.id} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <Link
                  href={routes.teacher.classroom(classroom.id)}
                  className="rounded-sm text-sm font-extrabold text-ink-900 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
                >
                  {classroom.name}
                </Link>
                <span aria-hidden className="shrink-0 text-sm font-extrabold text-ink-700">
                  {classroom.averageProgress} %
                </span>
              </div>
              <ProgressBar value={classroom.averageProgress} label={`Progression : ${classroom.name}`} />
            </li>
          ))}
        </ul>
      </Panel>
      <Panel id="taux-reussite" title="Taux de réussite">
        <dl className="m-0 flex flex-col gap-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="font-bold text-ink-700">Quiz formatifs</dt>
            <dd className="m-0 text-right font-black text-ink-900">{rateLabel(course.formativePassRate)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="font-bold text-ink-700">Évaluations sommatives</dt>
            <dd className="m-0 text-right font-black text-ink-900">{rateLabel(course.summativePassRate)}</dd>
          </div>
        </dl>
      </Panel>
      <Panel id="plus-echoues" title="Les plus échoués">
        {weakest.length === 0 ? (
          <p className="m-0 text-sm font-semibold text-ink-600">Aucun niveau ni projet en difficulté pour l&apos;instant.</p>
        ) : (
          <ol className="m-0 flex list-none flex-col gap-2 p-0">
            {weakest.map((step) => (
              <li key={step.key} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 font-bold text-ink-800">
                  <span className="text-xs font-extrabold tracking-[.04em] text-ink-600 uppercase">{step.kind} · </span>
                  {step.label}
                </span>
                <span className="shrink-0 font-black text-error-700">{step.rate} % de réussite</span>
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </div>
  );
}
