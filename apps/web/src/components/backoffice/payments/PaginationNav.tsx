import Link from "next/link";

import { cx } from "@/lib/cx";

import { FOCUS } from "../styles";

export type PaginationNavProps = {
  page: number;
  hasPrevious: boolean;
  hasNext: boolean;
  /** URL de la page demandée, filtres conservés. */
  hrefFor: (page: number) => string;
  /** Texte d'ensemble (« 42 paiements »). */
  summary?: string;
};

const LINK = cx(
  "inline-flex items-center rounded-[10px] border-[1.5px] border-ink-200 bg-surface px-3.5 py-2 text-[13px] font-extrabold text-ink-900 no-underline hover:bg-ink-50",
  FOCUS,
);
const OFF = "inline-flex items-center rounded-[10px] border-[1.5px] border-ink-100 px-3.5 py-2 text-[13px] font-extrabold text-ink-600";

/** « Précédent » / « Suivant » en liens adressables ; rien à afficher quand tout tient sur une page. */
export function PaginationNav({ page, hasPrevious, hasNext, hrefFor, summary }: PaginationNavProps) {
  if (!hasPrevious && !hasNext) return null;
  return (
    <nav aria-label="Pagination" className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="m-0 text-xs font-semibold text-ink-600">
        {summary && <>{summary} · </>}
        <span aria-current="page">Page {page}</span>
      </p>
      <div className="flex gap-2">
        {hasPrevious ? (
          <Link href={hrefFor(page - 1)} rel="prev" className={LINK}>
            Précédent
          </Link>
        ) : (
          <span aria-hidden className={OFF}>
            Précédent
          </span>
        )}
        {hasNext ? (
          <Link href={hrefFor(page + 1)} rel="next" className={LINK}>
            Suivant
          </Link>
        ) : (
          <span aria-hidden className={OFF}>
            Suivant
          </span>
        )}
      </div>
    </nav>
  );
}
