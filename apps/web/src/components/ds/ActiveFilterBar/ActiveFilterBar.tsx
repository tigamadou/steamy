import Link from "next/link";

import { Icon } from "../Icon";

export type ActiveFilter = {
  id: string;
  label: string;
  /** Même liste sans ce filtre. */
  removeHref: string;
};

export type ActiveFilterBarProps = {
  /** Résultat annoncé (« 3 parcours »), lu dans l'API. */
  countLabel: string;
  filters: ActiveFilter[];
  /** Liste sans aucun filtre. */
  clearHref: string;
};

// Filtres actifs de WC02 (design/screens-catalog-web.jsx, `ActiveFilterBar`) : compteur, une puce retirable par
// filtre, « Effacer les filtres ». Rien n'est rendu sans filtre.
export function ActiveFilterBar({ countLabel, filters, clearHref }: ActiveFilterBarProps) {
  if (filters.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-primary-200 bg-primary-50 px-3.5 py-2.5 text-[13px] font-bold text-primary-700">
      <p className="font-black">{countLabel}</p>
      <span aria-hidden className="text-primary-300">
        ·
      </span>
      <ul aria-label="Filtres actifs" className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <li key={filter.id}>
            <Link
              href={filter.removeHref}
              scroll={false}
              aria-label={`Retirer le filtre ${filter.label}`}
              className="inline-flex items-center gap-1 rounded-pill border-[1.5px] border-primary-300 bg-surface px-2.5 py-1 font-extrabold hover:bg-primary-50 focus-visible:outline-3 focus-visible:outline-primary-500"
            >
              {filter.label}
              <Icon name="x" size={12} strokeWidth={3} />
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href={clearHref}
        scroll={false}
        className="ml-auto font-extrabold underline underline-offset-2 focus-visible:outline-3 focus-visible:outline-primary-500"
      >
        Effacer les filtres
      </Link>
    </div>
  );
}
