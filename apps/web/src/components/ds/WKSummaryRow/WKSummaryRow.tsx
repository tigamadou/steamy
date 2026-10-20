import type { ReactNode } from "react";

import { cx } from "@/lib/cx";

export type WKSummaryRowProps = {
  label: ReactNode;
  /** Montant déjà mis en forme, lu dans l'API (D37), ou texte (« Calculée à l'étape suivante »). */
  value: ReactNode;
  /** Ligne du total. */
  strong?: boolean;
  className?: string;
};

/** Ligne d'un récapitulatif de commande (WK03, WK06) : à placer dans un `<dl>`. */
export function WKSummaryRow({ label, value, strong, className }: WKSummaryRowProps) {
  return (
    <div
      className={cx(
        "flex items-baseline justify-between gap-3",
        strong ? "text-lg font-black text-ink-900" : "text-sm font-bold text-ink-600",
        className,
      )}
    >
      <dt>{label}</dt>
      <dd className={cx("text-right", strong && "text-primary-700")}>{value}</dd>
    </div>
  );
}
