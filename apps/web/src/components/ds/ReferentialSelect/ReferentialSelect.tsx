"use client";

import { useId } from "react";

import { cx } from "@/lib/cx";

import { Button } from "../Button";
import { Icon } from "../Icon";
import { Select } from "../Select";

/** Entrée d'un référentiel de l'API (`{ id, code, label }`). */
export type ReferentialItem = { code: string; label: string; id?: number | string };

export type ReferentialSelectProps = {
  /** Entrées servies par l'API, affichées dans l'ordre reçu ; `undefined` tant qu'elles ne sont pas chargées. */
  items: readonly ReferentialItem[] | undefined;
  status: "loading" | "error" | "ready";
  /** Relance le chargement après une erreur. */
  onRetry?: () => void;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  name?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  /** Option vide en tête de liste. */
  placeholder?: string;
  /** Champ envoyé comme valeur : `code` (défaut) ou `id`. */
  valueKey?: "code" | "id";
  "aria-describedby"?: string;
  className?: string;
};

// `select` alimenté par un référentiel (classes, liens de parenté, handicaps…), compatible `Field`.
export function ReferentialSelect({
  items,
  status,
  onRetry,
  onChange,
  disabled,
  placeholder = "Choisis…",
  valueKey = "code",
  className,
  "aria-describedby": describedBy,
  ...rest
}: ReferentialSelectProps) {
  const errorId = `referentiel-${useId()}-erreur`;
  const ready = status === "ready";
  const failed = status === "error";

  return (
    <div className={cx("flex flex-col gap-2", className)}>
      <Select
        {...rest}
        disabled={disabled || !ready}
        aria-busy={status === "loading" || undefined}
        aria-describedby={[describedBy, failed && errorId].filter(Boolean).join(" ") || undefined}
        onChange={(event) => onChange?.(event.target.value)}
      >
        {status === "loading" ? (
          <option value="">Chargement…</option>
        ) : (
          <>
            <option value="">{placeholder}</option>
            {ready &&
              items?.map((item) => {
                const optionValue = String(item[valueKey]);
                return (
                  <option key={optionValue} value={optionValue}>
                    {item.label}
                  </option>
                );
              })}
          </>
        )}
      </Select>
      <div aria-live="polite">
        {failed && (
          <div className="flex flex-wrap items-center gap-3">
            <p id={errorId} className="flex items-center gap-1 text-[13px] font-bold text-error-600">
              <Icon name="alert" size={14} strokeWidth={2.5} />
              Impossible de charger la liste.
            </p>
            {onRetry && (
              <Button variant="outline" size="sm" className="min-h-11" onClick={onRetry}>
                Réessayer
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
