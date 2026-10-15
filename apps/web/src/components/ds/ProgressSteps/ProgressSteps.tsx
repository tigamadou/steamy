import { cx } from "@/lib/cx";

export type ProgressStepsProps = {
  /** Étape courante (1 = première étape remplie). */
  step: number;
  /** Nombre total d'étapes. */
  total: number;
  /** Texte annoncé à la place de « Étape n sur N » (ex. le kicker « Profil 2/4 »). */
  label?: string;
  className?: string;
};

// Barre de progression segmentée (design/ds-complex.jsx `ProgressSteps`, topbar de `WebShell`) :
// `step` segments remplis en primaire, les autres en `ink-100`. Compteurs : SPEC-ECRANS-1 §2.4.
export function ProgressSteps({ step, total, label, className }: ProgressStepsProps) {
  const count = Math.max(0, Math.floor(total));
  const current = Math.min(Math.max(0, step), count);

  return (
    <div
      role="progressbar"
      aria-label="Progression"
      aria-valuemin={0}
      aria-valuemax={count}
      aria-valuenow={current}
      aria-valuetext={label ?? `Étape ${current} sur ${count}`}
      className={cx("flex w-full gap-2", className)}
    >
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          aria-hidden
          data-done={i < current || undefined}
          className={cx("h-1.5 flex-1 rounded-pill", i < current ? "bg-primary-500" : "bg-ink-100")}
        />
      ))}
    </div>
  );
}
