import Link from "next/link";

import { cx } from "@/lib/cx";

export type TabItem = {
  href: string;
  label: string;
};

export type TabsProps = {
  items: TabItem[];
  /** URL de l'onglet courant (la page la connaît : pas de lecture de l'URL côté client). */
  activeHref: string;
  /** Libellé de la navigation (ex. « Documents légaux »). */
  label: string;
  className?: string;
};

// Onglets « pilule » (tabs-pill, WL09) : chaque onglet est un lien adressable, l'actif porte `aria-current`.
export function Tabs({ items, activeHref, label, className }: TabsProps) {
  return (
    <nav aria-label={label} className={cx("max-w-full overflow-x-auto", className)}>
      <ul className="inline-flex gap-0.5 rounded-pill bg-ink-100 p-1">
        {items.map((item) => {
          const active = item.href === activeHref;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "block whitespace-nowrap rounded-pill px-4.5 py-2 text-[13px] font-extrabold transition-colors",
                  "focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-primary-500",
                  active ? "bg-surface text-primary-600 shadow-pop-sm" : "text-ink-600 hover:text-ink-900",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
