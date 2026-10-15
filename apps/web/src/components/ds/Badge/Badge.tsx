import type { ReactNode } from "react";

import { cx } from "@/lib/cx";

import { Icon, type IconName } from "../Icon";

const TONES = {
  neutral: "bg-ink-100 text-ink-700",
  primary: "bg-primary-100 text-primary-700",
  success: "bg-success-100 text-success-800",
  amber: "bg-amber-100 text-amber-700",
  error: "bg-error-100 text-error-700",
  info: "bg-info-50 text-info-700",
} as const;

export type BadgeTone = keyof typeof TONES;

export type BadgeProps = {
  tone?: BadgeTone;
  /** Pastille pleine, en primaire. */
  solid?: boolean;
  icon?: IconName;
  className?: string;
  children: ReactNode;
};

export function Badge({ tone = "neutral", solid, icon, className, children }: BadgeProps) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-pill px-2.5 py-1.25 text-[13px] font-extrabold leading-none",
        solid ? "bg-primary-500 text-white" : TONES[tone],
        className,
      )}
    >
      {icon && <Icon name={icon} size={14} strokeWidth={2.5} />}
      {children}
    </span>
  );
}
