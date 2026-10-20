"use client";

import { cx } from "@/lib/cx";

import { Icon } from "../Icon";

export type WKQtyStepperProps = {
  value: number;
  onChange: (value: number) => void;
  /** Nom de l'article, lu avec les boutons (« Retirer un Steamy Bot v1 »). */
  itemName: string;
  min?: number;
  /** Borne haute donnée par le serveur (stock disponible) ; sans elle, l'API refuse ce qu'elle n'accepte pas. */
  max?: number;
  disabled?: boolean;
  className?: string;
};

const button =
  "flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-[10px] border-2 border-ink-200 bg-surface text-ink-700 hover:bg-ink-50 focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-primary-500 disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400";

/** Quantité d'une ligne du panier (WK03) : `−` / valeur / `+`, deux vrais boutons et la valeur annoncée. */
export function WKQtyStepper({ value, onChange, itemName, min = 1, max, disabled, className }: WKQtyStepperProps) {
  return (
    <div role="group" aria-label={`Quantité de ${itemName}`} className={cx("flex items-center gap-2.5", className)}>
      <button
        type="button"
        className={button}
        aria-label={`Retirer un exemplaire de ${itemName}`}
        disabled={disabled || value <= min}
        onClick={() => onChange(value - 1)}
      >
        <Icon name="minus" size={16} strokeWidth={3} />
      </button>
      <output aria-live="polite" className="min-w-5 text-center text-[15px] font-black text-ink-900 tabular-nums">
        {value}
      </output>
      <button
        type="button"
        className={button}
        aria-label={`Ajouter un exemplaire de ${itemName}`}
        disabled={disabled || (max !== undefined && value >= max)}
        onClick={() => onChange(value + 1)}
      >
        <Icon name="plus" size={16} strokeWidth={3} />
      </button>
    </div>
  );
}
