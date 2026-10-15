import type { ReactNode } from "react";

import { cx } from "@/lib/cx";

const TONES = {
  primary: { root: "bg-linear-135 from-primary-500 to-primary-700 text-white", topbar: "border-white/20" },
  light: { root: "bg-bg text-ink-900", topbar: "border-ink-100" },
  error: { root: "bg-error-50 text-ink-900", topbar: "border-error-100" },
} as const;

export type FullScreenStageTone = keyof typeof TONES;

export type FullScreenStageProps = {
  /** `primary` : dégradé primaire et texte blanc (W01) ; `light` : fond de page (W07, W14) ; `error` : fond d'erreur. */
  tone?: FullScreenStageTone;
  children: ReactNode;
  /** Barre en haut (ex. `ProgressSteps` et lien d'aide), 64 px. */
  topbar?: ReactNode;
  className?: string;
};

// Mise en page plein écran centrée pour les écrans hors `WebShell` : W01, W07, W14, W15 (SPEC-ECRANS-1 §2.2).
export function FullScreenStage({ tone = "light", children, topbar, className }: FullScreenStageProps) {
  const styles = TONES[tone];
  return (
    <main
      id="contenu"
      data-tone={tone}
      className={cx("relative flex min-h-dvh flex-col overflow-hidden", styles.root, className)}
    >
      {topbar && (
        <div
          className={cx("flex h-16 shrink-0 items-center justify-between gap-4 border-b px-4 md:px-12", styles.topbar)}
        >
          {topbar}
        </div>
      )}
      <div className="flex flex-1 items-center justify-center px-4 py-8 md:px-12">
        <div className="relative flex w-full max-w-[560px] flex-col items-center gap-6 text-center">{children}</div>
      </div>
    </main>
  );
}
