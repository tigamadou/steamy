import Link from "next/link";
import type { ReactNode } from "react";

import { cx } from "@/lib/cx";

import { Icon, type IconName } from "../Icon";

const TONES = {
  primary: "bg-primary-100 text-primary-600",
  amber: "bg-amber-100 text-amber-700",
  success: "bg-success-100 text-success-700",
} as const;

export type QuickActionTileProps = {
  icon: IconName;
  title: string;
  /** Compteur lu dans l'API (« 3 parcours »), facultatif. */
  count?: ReactNode;
  href: string;
  tone?: keyof typeof TONES;
  className?: string;
};

// Raccourci (design/screens-dashboard-web.jsx, `.quick-tile`) : un lien, jamais un bouton.
export function QuickActionTile({ icon, title, count, href, tone = "primary", className }: QuickActionTileProps) {
  return (
    <Link
      href={href}
      className={cx(
        "flex min-h-22 items-center gap-3.5 rounded-xl border-[1.5px] border-ink-100 bg-surface px-4.5 py-4 text-left transition",
        "hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-pop-sm motion-reduce:hover:translate-y-0",
        "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-500",
        className,
      )}
    >
      <span aria-hidden className={cx("flex size-12 shrink-0 items-center justify-center rounded-[14px]", TONES[tone])}>
        <Icon name={icon} size={22} strokeWidth={2.5} />
      </span>
      <span className="flex flex-col">
        <span className="text-[15px] font-extrabold text-ink-900">{title}</span>
        {count !== undefined && <span className="mt-0.5 text-xs font-bold text-ink-600">{count}</span>}
      </span>
    </Link>
  );
}
