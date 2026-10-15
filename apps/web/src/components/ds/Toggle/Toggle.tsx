"use client";

import { cx } from "@/lib/cx";

export type ToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Libellé accessible, quand aucun texte visible ne le porte (sinon `aria-labelledby`). */
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  id?: string;
  className?: string;
};

// Interrupteur (design/screens-dashboard-web.jsx, `.toggle`) : rôle `switch`, état annoncé par `aria-checked`.
export function Toggle({ checked, onChange, disabled, className, ...a11y }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative h-6 w-11 shrink-0 cursor-pointer rounded-pill p-0 transition-colors",
        "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-500",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary-500" : "bg-ink-300",
        className,
      )}
      {...a11y}
    >
      <span
        aria-hidden
        className={cx(
          "absolute top-0.5 left-0.5 size-5 rounded-pill bg-surface shadow-[0_2px_4px_rgba(0,0,0,.18)] transition-transform motion-reduce:transition-none",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
}
