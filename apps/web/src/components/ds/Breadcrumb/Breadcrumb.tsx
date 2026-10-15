import Link from "next/link";

import { cx } from "@/lib/cx";

export type BreadcrumbItem = {
  label: string;
  /** Absent pour la page courante (dernier élément). */
  href?: string;
};

export type BreadcrumbProps = {
  items: BreadcrumbItem[];
  className?: string;
};

/** Fil d'Ariane (WL18) : liens séparés par « › », la page courante marquée `aria-current`. */
export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav aria-label="Fil d'Ariane" className={cx("text-[13px] font-bold text-ink-600", className)}>
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
            {index > 0 && <span aria-hidden>›</span>}
            {item.href ? (
              <Link
                href={item.href}
                className="rounded-sm hover:text-primary-600 focus-visible:outline-3 focus-visible:outline-primary-500"
              >
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="font-black text-ink-900">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
