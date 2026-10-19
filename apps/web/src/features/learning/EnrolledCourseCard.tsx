import type { Schemas } from "@steamy/api-client";
import Link from "next/link";

import { Badge } from "@/components/ds/Badge";
import { Button } from "@/components/ds/Button";
import { ProgressBar } from "@/components/ds/ProgressBar";
import { DIFFICULTY_LABELS } from "@/lib/format";
import { routes } from "@/lib/routes";

import { formatLastActivity, position } from "./format";
import { nextStepHref } from "./next-step";

export type Enrollment = Schemas["Enrollment"];

/** « Projet 2 · Niveau 1 » : position renvoyée par l'API (ordre des éléments, jamais recalculé). */
export function positionLabel(enrollment: Pick<Enrollment, "currentProject" | "currentLevel">): string | null {
  const parts = [
    enrollment.currentProject && `Projet ${position(enrollment.currentProject)}`,
    enrollment.currentLevel && `Niveau ${position(enrollment.currentLevel)}`,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

function CourseVisual({ course }: { course: Enrollment["course"] }) {
  return (
    <span
      aria-hidden
      className="flex size-20 shrink-0 items-center justify-center self-start rounded-2xl text-4xl sm:size-28 sm:self-stretch sm:text-5xl"
      style={{ background: course.category.color }}
    >
      {course.emoji || course.category.icon}
    </span>
  );
}

// WD23 · Carte d'un parcours en cours : titre → WC06a, « Continuer » → étape suivante renvoyée par l'API.
export function EnrolledCourseCard({ enrollment, now }: { enrollment: Enrollment; now?: Date }) {
  const { course, next } = enrollment;
  const place = positionLabel(enrollment);
  return (
    <article className="flex flex-col gap-4 rounded-[20px] border-[1.5px] border-ink-100 bg-surface p-4 shadow-pop-sm sm:flex-row sm:gap-4.5">
      <CourseVisual course={course} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Badge tone="primary">{DIFFICULTY_LABELS[course.difficulty]}</Badge>
          {enrollment.source === "classroom" && (
            <Badge tone="amber" icon="user">
              Avec ta classe
            </Badge>
          )}
        </div>
        <h3 className="m-0 text-lg font-black text-ink-900">
          <Link
            href={routes.learner.course(course.slug)}
            className="rounded-sm hover:text-primary-600 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
          >
            {course.title}
          </Link>
        </h3>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <ProgressBar value={enrollment.progressPct} label={`Progression : ${course.title}`} className="max-w-90 flex-1" />
          <span className="text-[13px] font-black text-primary-700">{enrollment.progressPct} %</span>
          {place && <span className="text-[13px] font-extrabold text-ink-600">· {place}</span>}
        </div>
        <div className="flex flex-wrap gap-x-4.5 gap-y-1 text-[13px] font-bold text-ink-600">
          {next.type === "mission" && next.title && (
            <span>
              🎯 Prochaine mission : <b className="text-ink-900">{next.title}</b>
            </span>
          )}
          {enrollment.lastActivityAt && <span>🕒 Dernière activité : {formatLastActivity(enrollment.lastActivityAt, now)}</span>}
        </div>
      </div>
      <div className="flex items-center">
        <Button href={nextStepHref(next)} variant="secondary" icon="play" className="max-sm:w-full">
          Continuer
          <span className="sr-only"> {course.title}</span>
        </Button>
      </div>
    </article>
  );
}

export type DoneCourseCardProps = {
  enrollment: Enrollment;
  certificate: Schemas["Certificate"] | null;
  /** URL de téléchargement du PDF prêt ; absente tant qu'il se prépare (D33). */
  downloadUrl?: string;
};

// WD23 · Carte d'un parcours terminé : certification (PDF prêt) et lien vers WJ07.
export function DoneCourseCard({ enrollment, certificate, downloadUrl }: DoneCourseCardProps) {
  const { course } = enrollment;
  return (
    <article className="flex flex-col gap-4 rounded-[20px] border-[1.5px] border-success-200 bg-surface p-4 shadow-pop-sm sm:flex-row sm:gap-4.5">
      <CourseVisual course={course} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Badge tone="primary">{DIFFICULTY_LABELS[course.difficulty]}</Badge>
          <Badge tone="success" icon="check">
            Terminé · {enrollment.progressPct} %
          </Badge>
        </div>
        <h3 className="m-0 text-lg font-black text-ink-900">
          <Link
            href={routes.learner.course(course.slug)}
            className="rounded-sm hover:text-primary-600 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
          >
            {course.title}
          </Link>
        </h3>
        {certificate && (
          <p className="m-0 text-[13px] font-bold text-ink-600">
            🏅 Certifié le {formatShortDay(certificate.issuedAt)} · certificat n° {certificate.number}
          </p>
        )}
        <Link
          href={routes.learner.certification(course.slug)}
          className="self-start rounded-sm text-[13px] font-black text-primary-600 hover:underline focus-visible:outline-3 focus-visible:outline-primary-500"
        >
          Voir ma certification ›
        </Link>
      </div>
      {downloadUrl && (
        <div className="flex items-center">
          <Button href={downloadUrl} variant="outline" icon="arrow-right" className="max-sm:w-full">
            Télécharger la certification
            <span className="sr-only"> {course.title}</span>
          </Button>
        </div>
      )}
    </article>
  );
}

const SHORT_DAY = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Africa/Porto-Novo",
});

function formatShortDay(isoInstant: string): string {
  return SHORT_DAY.format(new Date(isoInstant));
}
