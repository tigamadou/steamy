"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";

import { cx } from "@/lib/cx";

import { Icon } from "../Icon";

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: ReactNode;
  error?: ReactNode;
};

// Case à cocher native habillée. Jamais cochée par défaut (consentements explicites).
export function Checkbox({ label, error, id, className, ...rest }: CheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? `case-${generatedId}`;
  const errorId = error ? `${inputId}-erreur` : undefined;
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={inputId} className="flex cursor-pointer items-start gap-3">
        <span className="relative mt-px flex size-5.5 shrink-0">
          <input
            type="checkbox"
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={errorId}
            {...rest}
            className={cx(
              "peer size-full cursor-pointer appearance-none rounded-[7px] border-2 bg-surface transition-colors",
              "checked:border-primary-500 checked:bg-primary-500",
              "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-500",
              error ? "border-error-500" : "border-ink-300",
            )}
          />
          <Icon
            name="check"
            size={14}
            strokeWidth={3}
            className="pointer-events-none absolute inset-0 m-auto text-white opacity-0 peer-checked:opacity-100"
          />
        </span>
        <span className="text-[13px] leading-[1.45] font-semibold text-ink-700">{label}</span>
      </label>
      <div aria-live="polite">
        {error && (
          <p id={errorId} className="flex items-center gap-1 text-[13px] font-bold text-error-600">
            <Icon name="alert" size={14} strokeWidth={2.5} />
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
