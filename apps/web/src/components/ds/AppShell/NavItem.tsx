import Link from "next/link";

import { cx } from "@/lib/cx";

import { Icon, type IconName } from "../Icon";

export type NavEntry = {
  id: string;
  icon: IconName;
  label: string;
  href: string;
  /** Entrée masquée tant que son écran n'existe pas (D39) : jamais rendue, jamais « Bientôt ». */
  hidden?: boolean;
};

export type NavItemProps = {
  entry: NavEntry;
  active: boolean;
  onNavigate?: () => void;
};

// Entrée de la barre latérale (design/screens-dashboard-web.jsx, `.app-sidebar__item`).
export function NavItem({ entry, active, onNavigate }: NavItemProps) {
  if (entry.hidden) return null;
  return (
    <li>
      <Link
        href={entry.href}
        aria-current={active ? "page" : undefined}
        onClick={onNavigate}
        className={cx(
          "relative flex h-11 items-center gap-3 rounded-md px-3 text-sm font-extrabold transition-colors",
          "focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-primary-500",
          active
            ? "bg-primary-50 text-primary-700 before:absolute before:inset-y-2 before:left-0 before:w-0.75 before:rounded-pill before:bg-primary-500"
            : "text-ink-700 hover:bg-ink-100",
        )}
      >
        <Icon name={entry.icon} size={20} strokeWidth={active ? 2.5 : 2} />
        {entry.label}
      </Link>
    </li>
  );
}
