import type { Schemas } from "@steamy/api-client";

import { Button, Mascot, ProgressBar } from "@/components/ds";
import { routes } from "@/lib/routes";

type Enrollment = Schemas["Enrollment"];

/** Cible et libellé du bouton de reprise, d'après l'étape suivante renvoyée par l'API (rien n'est déduit ici). */
export function resumeAction(next: Schemas["NextStep"]): { href: string; label: string } {
  const l = routes.learner;
  if (next.type === "certification") return { href: l.certification(next.courseSlug), label: "Voir ma certification" };
  if (next.id === null) return { href: l.course(next.courseSlug), label: "Voir mon parcours" };
  if (next.type === "quiz") return { href: l.quiz(next.courseSlug, next.id), label: "Passer le quiz" };
  return { href: l.mission(next.courseSlug, next.id), label: "Continuer la mission" };
}

/**
 * Carte de reprise de WD01 (design/screens-dashboard-web.jsx, `.dash-hero`) : parcours en cours le plus récent,
 * projet et niveau de la prochaine étape, progression du parcours, bouton vers l'étape suivante (WJ03, quiz ou
 * certification).
 */
export function ResumeCard({ enrollment }: { enrollment: Enrollment }) {
  const { course, currentProject, currentLevel, progressPct, next } = enrollment;
  const kicker = [currentProject?.title, currentLevel?.title].filter(Boolean).join(" · ");
  const action = resumeAction(next);
  return (
    <section
      aria-labelledby="reprise-titre"
      className="relative flex min-h-40 items-center gap-6 overflow-hidden rounded-[22px] bg-linear-135 from-primary-500 to-primary-700 px-5 py-6 text-white sm:px-7"
    >
      <span aria-hidden className="absolute top-[12%] left-[36%] size-2 rounded-pill bg-amber-400 shadow-[0_0_16px_var(--amber-300)]" />
      <span aria-hidden className="absolute bottom-[16%] left-1/2 size-1.5 rounded-pill bg-white/60" />
      <div className="relative flex min-w-0 flex-1 flex-col gap-2 sm:max-w-[60%]">
        <p className="m-0 text-[11px] font-extrabold tracking-[0.08em] uppercase">
          En cours{kicker && <> · {kicker}</>}
        </p>
        <h2 id="reprise-titre" className="m-0 text-2xl leading-tight font-black tracking-[-0.01em] text-white">
          {course.title}
        </h2>
        {next.type !== "certification" && next.title && (
          <p className="m-0 text-sm font-bold">
            {next.type === "quiz" ? "Prochain quiz" : "Prochaine mission"} : {next.title}
          </p>
        )}
        <div className="mt-2 mb-1 flex max-w-[380px] items-center gap-3">
          <ProgressBar value={progressPct} label={`Progression du parcours ${course.title}`} tone="amber" inverse />
          <span aria-hidden className="text-xs font-black">
            {progressPct} %
          </span>
        </div>
        <div className="mt-2">
          <Button href={action.href} variant="amber" size="lg" icon="play">
            {action.label}
          </Button>
        </div>
      </div>
      <div aria-hidden className="pointer-events-none absolute -top-4 -right-2 hidden md:block">
        <Mascot pose="cheer" size={170} hue="#fff" />
      </div>
    </section>
  );
}
