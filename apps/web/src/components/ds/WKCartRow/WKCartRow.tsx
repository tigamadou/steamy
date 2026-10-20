"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

import { cx } from "@/lib/cx";

import { Badge } from "../Badge";
import { Icon } from "../Icon";
import { WKQtyStepper } from "../WKQtyStepper";

export type WKCartRowProps = {
  name: string;
  /** Fiche du kit (WK02). */
  href: string;
  emoji?: string;
  /** Couleur de la catégorie du kit (API). */
  color?: string;
  /** Prix unitaire, déjà mis en forme (API, D37). */
  priceLabel: string;
  /** Total de la ligne, déjà mis en forme (API pour un panier serveur). */
  totalLabel: string;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
  /** Kit épuisé depuis l'ajout : la ligne doit être retirée avant de commander. */
  unavailable?: boolean;
  /** Borne de la quantité donnée par le serveur. */
  max?: number;
  /** Enregistrement en cours : commandes désactivées. */
  busy?: boolean;
  removeLabel?: string;
  className?: string;
};

/** Ligne du panier (WK03) : visuel, nom vers la fiche, prix unitaire, quantité, total et « Retirer ». */
export function WKCartRow({
  name,
  href,
  emoji,
  color,
  priceLabel,
  totalLabel,
  quantity,
  onQuantityChange,
  onRemove,
  unavailable,
  max,
  busy,
  removeLabel = "Retirer",
  className,
}: WKCartRowProps) {
  return (
    <div
      aria-busy={busy || undefined}
      className={cx(
        "flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border-[1.5px] border-ink-100 bg-surface p-4",
        className,
      )}
    >
      <span
        aria-hidden
        className={cx(
          "flex size-14 shrink-0 items-center justify-center rounded-[14px] bg-(--row-color) text-[28px]",
          unavailable && "opacity-50",
        )}
        style={{ "--row-color": color ?? "var(--cat-robotique)" } as CSSProperties}
      >
        {emoji}
      </span>
      <div className="min-w-0 flex-1 basis-40">
        <Link
          href={href}
          className="text-[15px] font-black text-ink-900 hover:underline focus-visible:outline-3 focus-visible:outline-primary-500"
        >
          {name}
        </Link>
        <p className={cx("mt-0.5 text-[13px] font-bold", unavailable ? "text-ink-600" : "text-primary-700")}>
          {priceLabel}
          <span className="sr-only"> l&apos;unité</span>
        </p>
        {unavailable && (
          <Badge tone="error" className="mt-1.5">
            Indisponible
          </Badge>
        )}
      </div>
      <div className="flex flex-1 basis-56 items-center justify-between gap-3 sm:flex-none">
        <WKQtyStepper
          value={quantity}
          onChange={onQuantityChange}
          itemName={name}
          max={max}
          disabled={busy || unavailable}
        />
        <p className="min-w-24 text-right text-[15px] font-black text-ink-900">
          <span className="sr-only">Total : </span>
          {totalLabel}
        </p>
        <button
          type="button"
          onClick={onRemove}
          disabled={busy}
          aria-label={`${removeLabel} ${name}`}
          className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-[10px] text-ink-500 hover:bg-ink-50 hover:text-error-700 focus-visible:outline-3 focus-visible:outline-primary-500 disabled:cursor-not-allowed"
        >
          <Icon name="x" size={20} />
        </button>
      </div>
    </div>
  );
}
