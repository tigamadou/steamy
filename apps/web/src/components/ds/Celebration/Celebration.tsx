import type { ReactNode } from "react";

import { cx } from "@/lib/cx";

import { Mascot } from "../Mascot";

// Confettis de `WLConfetti` (design/screens-public-web.jsx) : positions, couleurs de jetons, rotation i × 35°.
const CONFETTI = [
  { position: "left-[8%] top-[14%]", tone: "bg-amber-500", rotate: "rotate-0" },
  { position: "left-[90%] top-[12%]", tone: "bg-success-500", rotate: "rotate-[35deg]" },
  { position: "left-[14%] top-[82%]", tone: "bg-[var(--cat-code)]", rotate: "rotate-[70deg]" },
  { position: "left-[86%] top-[84%]", tone: "bg-primary-500", rotate: "rotate-[105deg]" },
  { position: "left-[50%] top-[7%]", tone: "bg-[var(--cat-ia)]", rotate: "rotate-[140deg]" },
  { position: "left-[70%] top-[90%]", tone: "bg-amber-500", rotate: "rotate-[175deg]" },
] as const;

export type CelebrationProps = {
  /** Titre de la célébration, rendu en `<h1>`. */
  title: ReactNode;
  /** Texte d'accompagnement. */
  children?: ReactNode;
  /** Boutons d'action (ex. « Continuer », « Se connecter »). */
  actions?: ReactNode;
  /** Remplace la mascotte (ex. un `Avatar` en W15). */
  mascot?: ReactNode;
  /** `main` (défaut) : écran autonome avec `id="contenu"` ; `div` : à placer dans une page qui a déjà son `main`. */
  as?: "main" | "div";
  className?: string;
};

// Écran de réussite unique (W08, W15, WP06, WP10, WL05) : carte à bordure verte, confettis décoratifs,
// mascotte qui applaudit. Les confettis n'apparaissent en fondu que si l'utilisateur accepte les animations.
// Aucune minuterie ni redirection : l'utilisateur poursuit avec les actions.
export function Celebration({ title, children, actions, mascot, as: Tag = "main", className }: CelebrationProps) {
  return (
    <Tag
      id={Tag === "main" ? "contenu" : undefined}
      className={cx(
        "relative isolate flex min-h-dvh items-center justify-center overflow-hidden bg-linear-to-b from-success-100 to-bg px-4 py-12",
        className,
      )}
    >
      <div aria-hidden data-testid="confettis" className="-z-10">
        {CONFETTI.map((piece) => (
          <span
            key={piece.position}
            className={cx(
              "absolute size-3.5 rounded-[3px]",
              piece.position,
              piece.tone,
              piece.rotate,
              "motion-safe:transition-[opacity,scale] motion-safe:duration-700 motion-safe:ease-(--ease-bounce) motion-safe:starting:scale-0 motion-safe:starting:opacity-0",
            )}
          />
        ))}
      </div>

      <div className="flex w-full max-w-[540px] flex-col items-center gap-6 rounded-[28px] border-3 border-success-500 bg-surface px-6 py-10 text-center shadow-[0_8px_0_var(--success-200)] md:px-12 md:py-14">
        {mascot ?? (
          <div className="flex size-40 items-center justify-center rounded-full bg-success-100 md:size-50">
            <Mascot pose="cheer" size={160} hue="var(--success-500)" className="h-auto w-32 md:w-40" />
          </div>
        )}
        <div>
          <h1 className="text-[28px] leading-[1.1] font-black tracking-[-0.02em] text-balance text-success-700 md:text-4xl">
            {title}
          </h1>
          {children && (
            <div className="mt-3.5 text-[15px] leading-normal font-semibold text-ink-700 md:text-base">{children}</div>
          )}
        </div>
        {actions && <div className="flex w-full flex-col justify-center gap-3 sm:flex-row">{actions}</div>}
      </div>
    </Tag>
  );
}
