"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";

import { cx } from "@/lib/cx";

import { Icon } from "../Icon";

export type GoalChipProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
  /** Emoji décoratif avant le libellé. */
  emoji?: string;
};

// Case à cocher native habillée en pastille ronde ; l'état visuel suit `:checked` (contrôlée ou non).
export function GoalChip({ label, emoji, id, className, ...rest }: GoalChipProps) {
  const generatedId = useId();
  const inputId = id ?? `objectif-${generatedId}`;
  return (
    <label
      htmlFor={inputId}
      className={cx(
        "inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-pill border-2 px-4 py-2.5 text-[13px] font-extrabold transition-colors duration-100",
        "border-ink-200 bg-surface text-ink-800 hover:bg-ink-50",
        "has-[:checked]:border-primary-500 has-[:checked]:bg-primary-500 has-[:checked]:text-white",
        "has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary-500",
        className,
      )}
    >
      <input type="checkbox" id={inputId} {...rest} className="sr-only" />
      {emoji && <span aria-hidden>{emoji}</span>}
      {label}
    </label>
  );
}

export type GoalChipOption = { value: string; label: string; emoji?: string };

export type GoalChipGroupProps = {
  legend: ReactNode;
  /** Légende réservée aux lecteurs d'écran (titre déjà affiché par l'écran). */
  legendHidden?: boolean;
  name: string;
  /** Objectifs servis par l'API, dans l'ordre reçu. */
  options: readonly GoalChipOption[];
  value: readonly string[];
  onChange: (value: string[]) => void;
  /** Minimum attendu : seulement annoncé, la page désactive son bouton tant qu'il n'est pas atteint. */
  min?: number;
  /** Texte du compteur (défaut : « 1 choisi · 2 minimum »). */
  countLabel?: (count: number, min: number) => ReactNode;
  error?: ReactNode;
  className?: string;
};

function defaultCountLabel(count: number, min: number) {
  return `${count} ${count > 1 ? "choisis" : "choisi"} · ${min} minimum`;
}

// Groupe de pastilles à choix multiple (W13, WP09).
export function GoalChipGroup({
  legend,
  legendHidden = false,
  name,
  options,
  value,
  onChange,
  min,
  countLabel = defaultCountLabel,
  error,
  className,
}: GoalChipGroupProps) {
  const baseId = `objectifs-${useId()}`;
  const countId = min !== undefined ? `${baseId}-compteur` : undefined;
  const errorId = error ? `${baseId}-erreur` : undefined;
  const describedBy = [countId, errorId].filter(Boolean).join(" ") || undefined;

  function toggle(code: string, checked: boolean) {
    onChange(checked ? [...value, code] : value.filter((item) => item !== code));
  }

  return (
    <fieldset aria-describedby={describedBy} className={cx("m-0 min-w-0 border-0 p-0", className)}>
      <legend className={legendHidden ? "sr-only" : "mb-2 p-0 text-sm font-bold text-ink-700"}>{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <GoalChip
            key={option.value}
            name={name}
            value={option.value}
            label={option.label}
            emoji={option.emoji}
            checked={value.includes(option.value)}
            aria-invalid={error ? true : undefined}
            onChange={(event) => toggle(option.value, event.target.checked)}
          />
        ))}
      </div>
      <div aria-live="polite" className="mt-1.5 flex flex-col gap-1">
        {countId && (
          <p id={countId} className="text-[13px] font-semibold text-ink-600">
            {countLabel(value.length, min as number)}
          </p>
        )}
        {error && (
          <p id={errorId} className="flex items-center gap-1 text-[13px] font-bold text-error-600">
            <Icon name="alert" size={14} strokeWidth={2.5} />
            {error}
          </p>
        )}
      </div>
    </fieldset>
  );
}
