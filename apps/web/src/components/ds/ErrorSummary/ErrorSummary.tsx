"use client";

import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from "react";

import { cx } from "@/lib/cx";

import { Icon } from "../Icon";

export type ErrorSummaryItem = {
  /** Identifiant du champ en erreur : le message devient un lien qui y place le focus. */
  field?: string;
  message: ReactNode;
};

export type ErrorSummaryProps = {
  /** Titre du récapitulatif (surchargeable pour le vouvoiement). */
  title?: ReactNode;
  errors: ErrorSummaryItem[];
  /** Change à chaque envoi échoué : le récapitulatif reçoit alors le focus. */
  focusKey?: string | number;
  className?: string;
};

// Récapitulatif des erreurs en tête de formulaire. Reçoit le focus après un envoi échoué (`focusKey`)
// et renvoie, par lien, vers chaque champ en erreur. Rien n'est rendu sans erreur.
export function ErrorSummary({
  title = "Corrige les erreurs suivantes :",
  errors,
  focusKey,
  className,
}: ErrorSummaryProps) {
  const titleId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const hasErrors = errors.length > 0;

  useEffect(() => {
    if (focusKey !== undefined && hasErrors) boxRef.current?.focus();
  }, [focusKey, hasErrors]);

  if (!hasErrors) return null;

  const focusField = (event: MouseEvent<HTMLAnchorElement>, field: string) => {
    const target = document.getElementById(field);
    if (!target) return;
    event.preventDefault();
    target.focus();
  };

  return (
    <div
      ref={boxRef}
      role="alert"
      tabIndex={-1}
      aria-labelledby={titleId}
      className={cx(
        "rounded-lg border-2 border-error-500 bg-error-50 p-4 text-ink-900",
        "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-500",
        className,
      )}
    >
      <h2 id={titleId} className="flex items-center gap-2 text-base font-extrabold text-error-700">
        <Icon name="alert" size={20} strokeWidth={2.5} />
        {title}
      </h2>
      <ul className="mt-2 flex list-disc flex-col gap-1 pl-9 text-sm font-semibold">
        {errors.map(({ field, message }, index) => (
          <li key={field ?? `erreur-${index}`}>
            {field ? (
              <a
                href={`#${field}`}
                onClick={(event) => focusField(event, field)}
                className="rounded-sm font-bold text-error-700 underline underline-offset-2 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
              >
                {message}
              </a>
            ) : (
              message
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
