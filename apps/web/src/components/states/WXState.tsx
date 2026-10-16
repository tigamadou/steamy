import type { ReactNode } from "react";

import { Loader, Mascot, type MascotPose } from "@/components/ds";
import { cx } from "@/lib/cx";

export type WXStateProps = {
  pose: MascotPose;
  /** Pictogramme posé sur la mascotte (décoratif). */
  emoji?: string;
  /** Petite ligne au-dessus du titre (« Erreur 404 »). */
  kicker?: string;
  title: string;
  /** Identifiant du titre, pour l'associer à un dialogue (`aria-labelledby`). */
  titleId?: string;
  body: ReactNode;
  /** 1 ou 2 boutons (`Button`), le principal en dernier. */
  actions?: ReactNode;
  /** Niveau du titre : `h1` pour une page entière, `h2` dans une page qui a déjà son titre. */
  headingLevel?: 1 | 2;
  /** Version réduite, dans le flux d'une page (grille en erreur) plutôt qu'en plein écran. */
  compact?: boolean;
  className?: string;
  /** `ink` : variante monochrome du back-office (kicker et mascotte en encre). */
  tone?: "brand" | "ink";
};

// Carte d'état centrée (design/screens-states-web.jsx, WXState) : mascotte dans un cercle, titre, corps, actions.
export function WXState({
  pose,
  emoji,
  kicker,
  title,
  titleId,
  body,
  actions,
  headingLevel = 1,
  compact,
  className,
  tone = "brand",
}: WXStateProps) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <div
      className={cx(
        "flex w-full items-center justify-center px-4",
        compact ? "py-8" : "flex-1 py-12 sm:py-16",
        className,
      )}
    >
      <div
        className={cx(
          "flex w-full max-w-[540px] flex-col items-center gap-6 rounded-[28px] border-2 border-ink-100 bg-surface text-center shadow-[0_8px_0_var(--ink-100)]",
          compact ? "px-6 py-8" : "px-6 py-10 sm:px-12 sm:py-14",
        )}
      >
        <div
          className={cx(
            "relative flex items-center justify-center rounded-pill bg-ink-50",
            compact ? "size-32" : "size-40 sm:size-50",
          )}
        >
          <Mascot
            pose={pose}
            size={compact ? 100 : 128}
            hue={tone === "ink" ? "var(--ink-700)" : undefined}
            className={compact ? undefined : "sm:w-40 sm:h-auto"}
          />
          {emoji && (
            <span aria-hidden className={cx("absolute right-1.5 bottom-1.5", compact ? "text-3xl" : "text-[42px]")}>
              {emoji}
            </span>
          )}
        </div>
        <div>
          {kicker && (
            <p
              className={cx(
                "mb-2 text-[13px] font-black tracking-[0.08em] uppercase",
                tone === "ink" ? "text-ink-700" : "text-primary-600",
              )}
            >
              {kicker}
            </p>
          )}
          <Heading
            id={titleId}
            className={cx("m-0 font-black text-ink-900", compact ? "text-2xl" : "text-[26px] sm:text-[30px]")}
          >
            {title}
          </Heading>
          <div className="mt-3.5 text-[15px] leading-normal font-semibold text-ink-600">{body}</div>
        </div>
        {actions && <div className="flex flex-wrap justify-center gap-3">{actions}</div>}
      </div>
    </div>
  );
}

export type WXLoadingProps = {
  title: string;
  body: string;
  className?: string;
};

// WX03 : attente longue, mascotte concentrée et message rassurant. Jamais de spinner nu (§6).
export function WXLoading({ title, body, className }: WXLoadingProps) {
  return (
    <div className={cx("flex w-full flex-1 items-center justify-center px-4 py-16", className)}>
      <div className="flex flex-col items-center gap-5 text-center">
        <Mascot pose="focus" size={150} />
        <Loader stacked label={title} />
        <p className="m-0 max-w-[380px] text-sm leading-normal font-semibold text-ink-600">{body}</p>
      </div>
    </div>
  );
}
