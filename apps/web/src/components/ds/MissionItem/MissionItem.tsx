import Link from "next/link";

import { cx } from "@/lib/cx";

import { Icon } from "../Icon";

/**
 * État d'une étape, tel que l'API le renvoie (§4.4, ouverture séquentielle) : `done` faite, `current` la prochaine
 * étape à faire, `available` ouverte, `locked` verrouillée. Le front n'en déduit aucun.
 */
export type MissionState = "done" | "current" | "available" | "locked";

export type MissionItemProps = {
  /** « Mission 2 », « Niveau 1 »… */
  step: string;
  title: string;
  /** Durée formatée (« 45 min »). */
  duration?: string;
  state: MissionState;
  /** Emoji de l'étape (servi par l'API). */
  icon?: string;
  /** Cible quand l'étape est ouverte ; une étape verrouillée n'est jamais un lien. */
  href?: string;
  className?: string;
};

const STATUS: Record<MissionState, string | null> = {
  done: "Terminée",
  current: "En cours",
  available: null,
  locked: "Verrouillée",
};

// Étape d'un parcours (design/ds-complex.jsx, `MissionItem`). Verrouillée : ni lien, ni focus (§5.7, WC06).
export function MissionItem({ step, title, duration, state, icon, href, className }: MissionItemProps) {
  const locked = state === "locked";
  const status = STATUS[state];
  const content = (
    <>
      <span
        aria-hidden
        className={cx(
          "flex size-14 shrink-0 items-center justify-center rounded-[18px] text-2xl font-black",
          state === "done" && "bg-success-500 text-white shadow-[0_4px_0_var(--success-700)]",
          state === "current" && "bg-primary-500 text-white shadow-[0_4px_0_var(--primary-700)]",
          state === "available" && "bg-primary-100 text-primary-600",
          locked && "bg-ink-100 text-ink-500",
        )}
      >
        {state === "done" ? (
          <Icon name="check" size={24} strokeWidth={3} />
        ) : locked ? (
          <Icon name="lock" size={22} />
        ) : (
          (icon ?? "🤖")
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-extrabold tracking-[.04em] text-ink-600 uppercase">{step}</span>
        <span className="mt-0.5 block text-[15px] font-extrabold text-ink-900">{title}</span>
        <span className="mt-1 flex flex-wrap items-center gap-2.5 text-[13px] font-semibold text-ink-600">
          {duration && <span>⏱ {duration}</span>}
          {status && (
            <span
              className={cx(
                state === "done" && "text-success-700",
                state === "current" && "text-primary-600",
              )}
            >
              · {status}
            </span>
          )}
        </span>
      </span>
      {!locked && <Icon name="chevron-right" size={20} className="text-ink-400" />}
    </>
  );
  const box = cx(
    "flex items-center gap-3.5 rounded-lg border-2 bg-surface p-3.5",
    state === "current" ? "border-primary-300" : "border-ink-100",
    className,
  );

  if (locked || !href) {
    return (
      <div aria-disabled={locked || undefined} className={cx(box, locked && "cursor-not-allowed bg-ink-50")}>
        {content}
      </div>
    );
  }
  return (
    <Link
      href={href}
      aria-current={state === "current" ? "step" : undefined}
      className={cx(
        box,
        "transition hover:translate-x-0.5 hover:border-primary-200 motion-reduce:hover:translate-x-0",
        "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-500",
      )}
    >
      {content}
    </Link>
  );
}
