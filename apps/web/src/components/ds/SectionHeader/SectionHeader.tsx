import Link from "next/link";
import type { ReactNode } from "react";

import { cx } from "@/lib/cx";

import { Icon } from "../Icon";

export type SectionHeaderProps = {
  title: ReactNode;
  /** Lien d'action à droite (« Voir tout »). */
  action?: { label: string; href: string };
  /** Identifiant du titre, pour `aria-labelledby` de la section. */
  id?: string;
  /** Niveau de titre (h2 par défaut ; le h1 est porté par le header du shell). */
  as?: "h2" | "h3";
  className?: string;
};

// En-tête de section (design/screens-dashboard-web.jsx, `.section-head`).
export function SectionHeader({ title, action, id, as: Heading = "h2", className }: SectionHeaderProps) {
  return (
    <div className={cx("mb-2 flex items-center justify-between gap-4", className)}>
      <Heading id={id} className="m-0 text-lg font-black tracking-[-0.01em] text-ink-900">
        {title}
      </Heading>
      {action && (
        <Link
          href={action.href}
          className="flex shrink-0 items-center gap-1 rounded-sm text-sm font-extrabold text-primary-600 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
        >
          {action.label}
          <Icon name="chevron-right" size={14} />
        </Link>
      )}
    </div>
  );
}
