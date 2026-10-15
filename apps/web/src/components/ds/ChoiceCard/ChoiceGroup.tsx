"use client";

import { useId, useState, type CSSProperties, type ReactNode } from "react";

import { cx } from "@/lib/cx";

import { Icon } from "../Icon";

/** Contexte passé au rendu de chaque option. */
export type ChoiceRenderState = {
  checked: boolean;
  /** À poser sur le texte qui nomme l'option (nom accessible de la radio). */
  labelId: string;
  /** À poser sur le texte secondaire, quand le groupe a `withDescription`. */
  descriptionId: string;
};

export type ChoiceGroupProps<T extends { value: string }> = {
  legend: ReactNode;
  /** Légende réservée aux lecteurs d'écran (titre déjà affiché par l'écran). */
  legendHidden?: boolean;
  name: string;
  options: readonly T[];
  /** Valeur contrôlée. */
  value?: string;
  /** Valeur initiale (mode non contrôlé). */
  defaultValue?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  error?: ReactNode;
  /** Chaque option rend un texte secondaire lié en `aria-describedby`. */
  withDescription?: boolean;
  className?: string;
  /** Classes de la liste des options (disposition). */
  listClassName?: string;
  /** Classes de la carte d'une option selon son état. */
  optionClassName: (option: T, checked: boolean) => string;
  /** Style en ligne de la carte (couleur venue d'un jeton). */
  optionStyle?: (option: T, checked: boolean) => CSSProperties | undefined;
  renderOption: (option: T, state: ChoiceRenderState) => ReactNode;
};

/**
 * Groupe radio générique : `fieldset` + `legend`, radios natives visuellement masquées mais focusables
 * (flèches du clavier natives), carte entière cliquable, focus visible porté par la carte.
 */
export function ChoiceGroup<T extends { value: string }>({
  legend,
  legendHidden = false,
  name,
  options,
  value,
  defaultValue,
  onChange,
  required = false,
  error,
  withDescription = false,
  className,
  listClassName,
  optionClassName,
  optionStyle,
  renderOption,
}: ChoiceGroupProps<T>) {
  const baseId = `choix-${useId()}`;
  const [internal, setInternal] = useState(defaultValue);
  const current = value ?? internal;
  const errorId = error ? `${baseId}-erreur` : undefined;

  function select(next: string) {
    setInternal(next);
    onChange?.(next);
  }

  return (
    <fieldset aria-describedby={errorId} className={cx("m-0 min-w-0 border-0 p-0", className)}>
      <legend
        className={legendHidden ? "sr-only" : "mb-2 flex items-center gap-1 p-0 text-sm font-bold text-ink-700"}
      >
        {legend}
        {required && (
          <>
            <span aria-hidden className="text-error-600">
              *
            </span>
            <span className="sr-only">(obligatoire)</span>
          </>
        )}
      </legend>
      <div className={listClassName}>
        {options.map((option, index) => {
          const checked = current === option.value;
          const optionId = `${baseId}-${index}`;
          const state: ChoiceRenderState = {
            checked,
            labelId: `${optionId}-libelle`,
            descriptionId: `${optionId}-description`,
          };
          return (
            <label
              key={option.value}
              htmlFor={optionId}
              style={optionStyle?.(option, checked)}
              className={cx(
                "relative cursor-pointer transition-[background-color,border-color,box-shadow] duration-100",
                "has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary-500",
                optionClassName(option, checked),
              )}
            >
              <input
                type="radio"
                id={optionId}
                name={name}
                value={option.value}
                checked={checked}
                required={required}
                aria-labelledby={state.labelId}
                aria-describedby={withDescription ? state.descriptionId : undefined}
                onChange={() => select(option.value)}
                className="sr-only"
              />
              {renderOption(option, state)}
            </label>
          );
        })}
      </div>
      <div aria-live="polite">
        {error && (
          <p id={errorId} className="mt-1.5 flex items-center gap-1 text-[13px] font-bold text-error-600">
            <Icon name="alert" size={14} strokeWidth={2.5} />
            {error}
          </p>
        )}
      </div>
    </fieldset>
  );
}
