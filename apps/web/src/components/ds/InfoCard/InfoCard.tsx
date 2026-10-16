import Link from "next/link";
import type { ReactNode } from "react";

import { cx } from "@/lib/cx";

import { Icon } from "../Icon";

export type InfoCardRow = {
  label: ReactNode;
  /** Valeur lue dans l'API ; vide (`null`, `undefined`, `""`) : `emptyLabel` est affiché. */
  value?: ReactNode;
};

export type InfoCardProps = {
  title: ReactNode;
  rows: readonly InfoCardRow[];
  /** Lien d'action dans l'en-tête (« Modifier ») ; absent : carte en lecture seule. */
  action?: { label: string; href: string };
  /** Texte d'une valeur absente. */
  emptyLabel?: string;
  /** Niveau du titre (h3 par défaut, sous une `Section` en h2). */
  as?: "h2" | "h3";
  className?: string;
};

// Carte d'informations clé → valeur (ex-`WPDInfoCard`, design/screens-parent-dashboard-web.jsx), réutilisée par
// WD13, WPD08 et WT08. Liste de définitions, une ligne par donnée.
export function InfoCard({
  title,
  rows,
  action,
  emptyLabel = "Non renseigné",
  as: Heading = "h3",
  className,
}: InfoCardProps) {
  return (
    <div className={cx("rounded-lg border border-ink-100 bg-surface p-4.5", className)}>
      <div className="mb-3 flex items-center justify-between gap-4">
        <Heading className="m-0 text-sm font-black text-ink-900">{title}</Heading>
        {action && (
          <Link
            href={action.href}
            className="flex min-h-11 shrink-0 items-center gap-1 rounded-sm text-sm font-extrabold text-primary-600 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
          >
            {action.label}
            <span className="sr-only"> : {title}</span>
            <Icon name="chevron-right" size={14} />
          </Link>
        )}
      </div>
      <dl className="m-0 flex flex-col gap-2">
        {rows.map((row, index) => {
          const empty = row.value === null || row.value === undefined || row.value === "";
          return (
            <div key={index} className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 text-sm">
              <dt className="font-bold text-ink-600">{row.label}</dt>
              <dd className={cx("m-0 text-right font-extrabold", empty ? "text-ink-600" : "text-ink-900")}>
                {empty ? emptyLabel : row.value}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
