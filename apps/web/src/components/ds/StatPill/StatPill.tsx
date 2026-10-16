import type { ReactNode } from "react";

import { cx } from "@/lib/cx";

import { Icon, type IconName } from "../Icon";

const TONES = {
  amber: "bg-amber-100 text-amber-700",
  primary: "bg-primary-100 text-primary-700",
  success: "bg-success-100 text-success-700",
} as const;

export type StatPillTone = keyof typeof TONES;

export type StatPillProps = {
  icon: IconName;
  label: string;
  /** Valeur lue dans l'API (jamais calculée côté front). */
  value: ReactNode;
  tone?: StatPillTone;
  className?: string;
};

// Pastille de statistique (design/screens-dashboard-web.jsx, `.stat-pill`). L'appelant la retire quand l'API
// renvoie `null` (points et rang tant que le barème C8 n'est pas fixé, D34).
export function StatPill({ icon, label, value, tone = "primary", className }: StatPillProps) {
  return (
    <div
      className={cx(
        "flex min-h-16 flex-1 items-center gap-3.5 rounded-lg border-[1.5px] border-ink-100 bg-surface px-4.5 py-3.5",
        className,
      )}
    >
      <span aria-hidden className={cx("flex size-10 shrink-0 items-center justify-center rounded-md", TONES[tone])}>
        <Icon name={icon} size={20} strokeWidth={2.5} />
      </span>
      <dl className="m-0 flex flex-col">
        <dt className="text-xs font-bold text-ink-600">{label}</dt>
        <dd className="m-0 text-lg leading-tight font-black text-ink-900">{value}</dd>
      </dl>
    </div>
  );
}
