"use client";

import { useState, type KeyboardEvent } from "react";

import { cx } from "@/lib/cx";

import { Icon } from "../Icon";

export type NumberStepperProps = {
  min: number;
  max: number;
  /** Valeur contrôlée. */
  value?: number;
  /** Valeur initiale (non contrôlé) ; `min` par défaut. */
  defaultValue?: number;
  onChange?: (value: number) => void;
  /** Libellé accessible de la valeur (ex. « Ton âge »). */
  label: string;
  /** Unité affichée sous la valeur et lue avec elle (« 13 ans »). */
  unit?: string;
  /** Pas de `PageUp` / `PageDown`. */
  pageStep?: number;
  /** Nom du champ caché porté dans un envoi de formulaire. */
  name?: string;
  disabled?: boolean;
  decrementLabel?: string;
  incrementLabel?: string;
  id?: string;
  className?: string;
};

const sideButton =
  "flex size-14 shrink-0 cursor-pointer items-center justify-center rounded-[18px] transition-[transform,box-shadow] duration-100 active:translate-y-0.5 disabled:cursor-not-allowed disabled:border-2 disabled:border-ink-100 disabled:bg-ink-50 disabled:text-ink-500 disabled:shadow-none disabled:active:translate-y-0";

/** Sélecteur de nombre borné (W05 : âge 10-17, D23) : `−` / valeur / `+`, au clavier par la valeur. */
export function NumberStepper({
  min,
  max,
  value,
  defaultValue,
  onChange,
  label,
  unit,
  pageStep = 5,
  name,
  disabled = false,
  decrementLabel = "Diminuer",
  incrementLabel = "Augmenter",
  id,
  className,
}: NumberStepperProps) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const [internal, setInternal] = useState(() => clamp(defaultValue ?? min));
  const current = value !== undefined ? clamp(value) : internal;

  const set = (next: number) => {
    const bounded = clamp(next);
    if (disabled || bounded === current) return;
    setInternal(bounded);
    onChange?.(bounded);
  };

  const KEYS: Record<string, () => number> = {
    ArrowUp: () => current + 1,
    ArrowRight: () => current + 1,
    ArrowDown: () => current - 1,
    ArrowLeft: () => current - 1,
    PageUp: () => current + pageStep,
    PageDown: () => current - pageStep,
    Home: () => min,
    End: () => max,
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = KEYS[event.key];
    if (!next) return;
    event.preventDefault();
    set(next());
  };

  return (
    <div className={cx("flex items-center gap-4", className)}>
      <button
        type="button"
        tabIndex={-1}
        aria-label={decrementLabel}
        disabled={disabled || current <= min}
        onClick={() => set(current - 1)}
        className={cx(
          sideButton,
          "border-2 border-ink-200 bg-surface text-ink-900 shadow-[0_4px_0_var(--ink-200)] hover:bg-ink-50 active:shadow-[0_2px_0_var(--ink-200)]",
        )}
      >
        <Icon name="minus" size={28} strokeWidth={3} />
      </button>
      <div
        id={id}
        role="spinbutton"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={current}
        aria-valuetext={unit ? `${current} ${unit}` : undefined}
        aria-disabled={disabled || undefined}
        onKeyDown={onKeyDown}
        className={cx(
          "flex size-[140px] shrink-0 flex-col items-center justify-center rounded-[28px] border-3 border-primary-500 bg-surface shadow-[0_6px_0_var(--primary-300)] select-none",
          "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-500",
          disabled && "border-ink-200 shadow-[0_6px_0_var(--ink-200)]",
        )}
      >
        <span className={cx("text-[80px] leading-none font-black tabular-nums", disabled ? "text-ink-500" : "text-primary-600")}>
          {current}
        </span>
        {unit && <span className="text-[13px] font-extrabold text-ink-600">{unit}</span>}
      </div>
      <button
        type="button"
        tabIndex={-1}
        aria-label={incrementLabel}
        disabled={disabled || current >= max}
        onClick={() => set(current + 1)}
        className={cx(
          sideButton,
          "bg-primary-500 text-white shadow-[0_4px_0_var(--primary-700)] hover:bg-primary-600 active:shadow-[0_2px_0_var(--primary-700)]",
        )}
      >
        <Icon name="plus" size={28} strokeWidth={3} />
      </button>
      {name && <input type="hidden" name={name} value={current} />}
    </div>
  );
}
