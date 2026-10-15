"use client";

import { useId, useState, type ClipboardEvent, type ReactNode } from "react";

import { cx } from "@/lib/cx";

import { Icon } from "../Icon";

export type OTPInputProps = {
  /** Nombre de chiffres du code. */
  length?: number;
  /** Valeur contrôlée. */
  value?: string;
  /** Valeur initiale (non contrôlé). */
  defaultValue?: string;
  /** Code saisi, chiffres seuls. */
  onChange?: (code: string) => void;
  /** Appelé quand le code atteint `length` chiffres. */
  onComplete?: (code: string) => void;
  name?: string;
  id?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Message d'erreur annoncé immédiatement sous les cases. */
  error?: ReactNode;
  /** Libellé accessible ; « Code à 6 chiffres reçu par SMS » par défaut. */
  label?: string;
  className?: string;
};

const digits = (raw: string, length: number) => raw.replace(/\D/g, "").slice(0, length);

/**
 * Code à usage unique : cases visuelles adossées à un seul champ natif transparent posé dessus,
 * pour garder collage, autoremplissage SMS (`one-time-code`) et retour arrière du navigateur.
 */
export function OTPInput({
  length = 6,
  value,
  defaultValue = "",
  onChange,
  onComplete,
  name,
  id,
  disabled = false,
  autoFocus,
  error,
  label,
  className,
}: OTPInputProps) {
  const generatedId = useId();
  const inputId = id ?? `code-${generatedId}`;
  const errorId = `${inputId}-erreur`;
  const [internal, setInternal] = useState(() => digits(defaultValue, length));
  const [focused, setFocused] = useState(false);
  const code = value !== undefined ? digits(value, length) : internal;
  const invalid = !!error;
  // Case courante : la première vide, ou la dernière quand le code est complet
  const current = Math.min(code.length, length - 1);

  const commit = (raw: string) => {
    const next = digits(raw, length);
    if (next === code) return;
    setInternal(next);
    onChange?.(next);
    if (next.length === length) onComplete?.(next);
  };

  // Collage traité à la main : `maxLength` tronquerait « 12 34-56 » avant le nettoyage des séparateurs
  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = digits(event.clipboardData.getData("text"), length);
    if (pasted) commit(pasted);
  };

  return (
    <div className={cx("flex flex-col items-center gap-2", className)}>
      <div className="relative">
        <div aria-hidden className="flex gap-2">
          {Array.from({ length }, (_, index) => {
            const char = code[index] ?? "";
            const active = focused && !disabled && index === current;
            return (
              <span
                key={index}
                data-testid="otp-case"
                data-active={active || undefined}
                className={cx(
                  "flex h-14 w-12 items-center justify-center rounded-[14px] border-2 text-2xl font-black transition-[border-color,box-shadow]",
                  disabled
                    ? "border-ink-200 bg-ink-50 text-ink-500"
                    : invalid
                      ? "border-error-500 bg-error-50 text-error-700"
                      : char
                        ? "border-primary-500 bg-primary-50 text-primary-700"
                        : "border-ink-200 bg-surface text-ink-900",
                  active && (invalid ? "shadow-[0_0_0_4px_var(--error-100)]" : "border-primary-500 shadow-[0_0_0_4px_var(--primary-100)]"),
                )}
              >
                {char}
              </span>
            );
          })}
        </div>
        <input
          id={inputId}
          name={name}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d*"
          maxLength={length}
          value={code}
          onChange={(event) => commit(event.target.value)}
          onPaste={onPaste}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          autoFocus={autoFocus}
          aria-label={label ?? `Code à ${length} chiffres reçu par SMS`}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? errorId : undefined}
          className="absolute inset-0 size-full cursor-text bg-transparent text-base text-transparent caret-transparent opacity-0 outline-none disabled:cursor-not-allowed"
        />
      </div>
      <div aria-live="assertive">
        {invalid && (
          <p id={errorId} className="flex items-center gap-1 text-[13px] font-bold text-error-600">
            <Icon name="alert" size={14} strokeWidth={2.5} />
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
