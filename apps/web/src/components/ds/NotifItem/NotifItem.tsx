import type { ReactNode } from "react";

import { cx } from "@/lib/cx";

// Teinte de l'icône selon le `tone` renvoyé par l'API (D7) : fond clair, texte foncé (contraste AA).
const TONES = {
  info: "bg-info-50 text-info-700",
  success: "bg-success-100 text-success-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-error-100 text-error-700",
  primary: "bg-primary-100 text-primary-700",
} as const;

export type NotifTone = keyof typeof TONES;

export type NotifItemProps = {
  /** Pictogramme (emoji) choisi d'après le `type` de la notification ; décoratif. */
  icon: string;
  tone: NotifTone;
  title: string;
  message?: string;
  /** Ancienneté déjà mise en forme (« il y a 3 h »), dans un `<time>`. */
  time: ReactNode;
  /** Instant ISO de la notification, pour l'attribut `dateTime`. */
  dateTime: string;
  unread?: boolean;
  /** Rend l'élément activable (bouton) : lecture puis navigation, à la charge de l'appelant. */
  onSelect?: () => void;
  /** Lecture en cours : le bouton est désactivé et annoncé occupé. */
  busy?: boolean;
  className?: string;
};

// Élément de notification (design/ds-complex.jsx, `.notif`) : non lue = fond violet clair et pastille, annoncée
// « Non lue » aux lecteurs d'écran.
export function NotifItem({
  icon,
  tone,
  title,
  message,
  time,
  dateTime,
  unread,
  onSelect,
  busy,
  className,
}: NotifItemProps) {
  const classes = cx(
    "relative flex w-full gap-3 rounded-xl border-2 p-3.5 text-left",
    unread ? "border-primary-200 bg-primary-50" : "border-ink-100 bg-surface",
    onSelect &&
      "cursor-pointer transition-colors hover:border-primary-300 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:cursor-wait",
    className,
  );
  const content = (
    <>
      <span
        aria-hidden
        className={cx("flex size-11 shrink-0 items-center justify-center rounded-[14px] text-[22px]", TONES[tone])}
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col pr-4">
        <span className="text-sm leading-snug font-extrabold text-ink-900">
          {unread && <span className="sr-only">Non lue : </span>}
          {title}
        </span>
        {message && <span className="mt-0.5 text-[13px] leading-normal font-semibold text-ink-600">{message}</span>}
        <time dateTime={dateTime} suppressHydrationWarning className="mt-1.5 text-xs font-bold text-ink-600">
          {time}
        </time>
      </span>
      {unread && <span aria-hidden className="absolute top-4 right-3.5 size-2 rounded-pill bg-primary-500" />}
    </>
  );

  if (onSelect) {
    return (
      <button type="button" onClick={onSelect} disabled={busy} aria-busy={busy || undefined} className={classes}>
        {content}
      </button>
    );
  }
  return <div className={classes}>{content}</div>;
}
