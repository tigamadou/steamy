import Link from "next/link";

import { cx } from "@/lib/cx";

import { Icon } from "../Icon";

export type NotificationBellProps = {
  /** Nombre de notifications non lues, lu dans l'API. */
  count: number;
  href: string;
  className?: string;
};

/** Libellé accessible de la cloche : le nombre exact, même au-delà de 9. */
export function unreadLabel(count: number): string {
  if (count === 0) return "Notifications, aucune non lue";
  return count === 1 ? "1 notification non lue" : `${count} notifications non lues`;
}

// Cloche du header : un compteur (« 9+ » au-delà de 9) et non une simple pastille (§5.5).
export function NotificationBell({ count, href, className }: NotificationBellProps) {
  return (
    <Link
      href={href}
      aria-label={unreadLabel(count)}
      className={cx(
        "relative flex size-10 shrink-0 items-center justify-center rounded-md border-[1.5px] border-ink-100 bg-surface text-ink-700 hover:bg-ink-50",
        "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-500",
        className,
      )}
    >
      <Icon name="bell" size={18} />
      {count > 0 && (
        <span
          aria-hidden
          className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-pill border-2 border-surface bg-error-600 px-1 text-[10px] leading-none font-black text-white"
        >
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
