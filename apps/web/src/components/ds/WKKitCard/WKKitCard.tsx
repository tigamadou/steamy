import type { CSSProperties } from "react";

import { cx } from "@/lib/cx";

import { Badge, type BadgeTone } from "../Badge";

export type KitAvailability = "in_stock" | "low_stock" | "out_of_stock";

export type KitCardData = {
  name: string;
  description?: string;
  /** Libellé de difficulté ou de public (« Débutant »). */
  difficulty?: string;
  /** Prix déjà mis en forme (« 35 000 F CFA »). */
  priceLabel: string;
  availability: KitAvailability;
  /** Couleur de la catégorie du kit (API) ou token. */
  color?: string;
  emoji?: string;
};

const AVAILABILITY: Record<KitAvailability, { label: string; tone: BadgeTone }> = {
  in_stock: { label: "Disponible", tone: "success" },
  low_stock: { label: "Stock limité", tone: "amber" },
  out_of_stock: { label: "Épuisé", tone: "error" },
};

export type WKKitCardProps = {
  kit: KitCardData;
  /**
   * `vitrine` (lot 1) : prix et disponibilité, carte non cliquable, sans bouton « Ajouter ».
   * Le lot 3 ajoute le mode boutique (lien vers la fiche, panier).
   */
  mode?: "vitrine";
  className?: string;
};

export function WKKitCard({ kit, className }: WKKitCardProps) {
  const availability = AVAILABILITY[kit.availability];
  return (
    <article
      className={cx("flex flex-col overflow-hidden rounded-[22px] border-2 border-ink-100 bg-surface", className)}
    >
      <div
        aria-hidden
        className="flex aspect-16/10 items-center justify-center bg-(--card-color) text-[64px]"
        style={{ "--card-color": kit.color ?? "var(--cat-robotique)" } as CSSProperties}
      >
        {kit.emoji && <span className="drop-shadow-md">{kit.emoji}</span>}
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        {kit.difficulty && (
          <div>
            <Badge tone="primary">{kit.difficulty}</Badge>
          </div>
        )}
        <h3 className="text-base font-black text-ink-900">{kit.name}</h3>
        {kit.description && (
          <p className="flex-1 text-[13px] leading-[1.45] font-semibold text-ink-600">{kit.description}</p>
        )}
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <span className="text-md font-black text-primary-700">{kit.priceLabel}</span>
          <Badge tone={availability.tone}>{availability.label}</Badge>
        </div>
      </div>
    </article>
  );
}
