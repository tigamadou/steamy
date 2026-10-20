import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

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
   * Fiche du kit (WK02) : le nom devient un lien qui couvre la carte, focusable (§8.13). Sans lien, la carte est
   * une vitrine.
   */
  href?: string;
  /** Action de la carte (« Ajouter »), placée au-dessus du lien de la carte. */
  action?: ReactNode;
  className?: string;
};

/** Carte d'un kit (WL07, WK01) : visuel, Difficulté (S2), nom, description, prix et disponibilité lus dans l'API. */
export function WKKitCard({ kit, href, action, className }: WKKitCardProps) {
  const availability = AVAILABILITY[kit.availability];
  return (
    <article
      className={cx(
        "relative flex flex-col overflow-hidden rounded-[22px] border-2 border-ink-100 bg-surface",
        href && "transition-colors focus-within:border-primary-500 hover:border-primary-300",
        className,
      )}
    >
      <div
        aria-hidden
        className={cx(
          "flex aspect-16/10 items-center justify-center bg-(--card-color) text-[64px]",
          href && kit.availability === "out_of_stock" && "opacity-60",
        )}
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
        <h3 className="text-base font-black text-ink-900">
          {href ? (
            <Link
              href={href}
              className="outline-none after:absolute after:inset-0 after:content-[''] hover:underline focus-visible:underline"
            >
              {kit.name}
            </Link>
          ) : (
            kit.name
          )}
        </h3>
        {kit.description && (
          <p className="flex-1 text-[13px] leading-[1.45] font-semibold text-ink-600">{kit.description}</p>
        )}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
          <span className="text-md font-black text-primary-700">{kit.priceLabel}</span>
          <Badge tone={availability.tone}>{availability.label}</Badge>
        </div>
        {action && <div className="relative z-10 flex justify-end">{action}</div>}
      </div>
    </article>
  );
}
