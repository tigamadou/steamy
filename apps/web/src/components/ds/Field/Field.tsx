"use client";

import { createContext, useContext, useId, type ReactNode } from "react";

import { cx } from "@/lib/cx";

import { Icon } from "../Icon";

type FieldContextValue = {
  controlId: string;
  messageId?: string;
  invalid: boolean;
  required: boolean;
};

const FieldContext = createContext<FieldContextValue | null>(null);

/**
 * Attributs d'accessibilité du contrôle placé dans un `Field` : `id`, `aria-describedby`,
 * `aria-invalid`, `required`. Hors `Field`, renvoie les valeurs passées en props.
 */
export function useFieldControl(props: { id?: string; invalid?: boolean; required?: boolean; describedBy?: string }) {
  const field = useContext(FieldContext);
  const invalid = props.invalid ?? field?.invalid ?? false;
  const describedBy = [props.describedBy, field?.messageId].filter(Boolean).join(" ") || undefined;
  return {
    id: props.id ?? field?.controlId,
    "aria-describedby": describedBy,
    "aria-invalid": invalid || undefined,
    required: props.required ?? field?.required,
    invalid,
  };
}

export type FieldProps = {
  label: ReactNode;
  required?: boolean;
  /** Aide sous le champ, remplacée par l'erreur quand il y en a une. */
  hint?: ReactNode;
  /** Message d'erreur (validation locale ou `fields` de l'API). */
  error?: ReactNode;
  /** Identifiant du contrôle ; généré sinon. */
  id?: string;
  className?: string;
  /** Un seul contrôle : `Input`, `Textarea`, `Select` ou `PhoneInput`. */
  children: ReactNode;
};

export function Field({ label, required = false, hint, error, id, className, children }: FieldProps) {
  const generatedId = useId();
  const controlId = id ?? `champ-${generatedId}`;
  const message = error || hint;
  const messageId = message ? `${controlId}-message` : undefined;

  return (
    <FieldContext.Provider value={{ controlId, messageId, invalid: !!error, required }}>
      <div className={cx("flex flex-col gap-1.5", className)}>
        <label htmlFor={controlId} className="flex items-center gap-1 text-sm font-bold text-ink-700">
          {label}
          {required && (
            <>
              <span aria-hidden className="text-error-600">
                *
              </span>
              <span className="sr-only">(obligatoire)</span>
            </>
          )}
        </label>
        {children}
        <div aria-live="polite">
          {error ? (
            <p id={messageId} className="flex items-center gap-1 text-[13px] font-bold text-error-700">
              <Icon name="alert" size={14} strokeWidth={2.5} />
              {error}
            </p>
          ) : (
            hint && (
              <p id={messageId} className="text-[13px] font-semibold text-ink-600">
                {hint}
              </p>
            )
          )}
        </div>
      </div>
    </FieldContext.Provider>
  );
}
