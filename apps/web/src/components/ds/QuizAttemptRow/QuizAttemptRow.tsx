import Link from "next/link";

import { cx } from "@/lib/cx";

import { AttemptStatusBadge, type AttemptStatus } from "../AttemptStatusBadge";
import { Icon } from "../Icon";

export type QuizAttemptRowProps = {
  /** Détail de la tentative (WD08) ; absent : ligne en lecture seule (le parent, WPD03). */
  href?: string;
  title: string;
  /** Contexte (« Quiz du niveau · 14 oct. »). */
  subtitle: string;
  /** Statut calculé par le serveur (D31), affiché tel quel. */
  status: AttemptStatus;
  score: number;
  total: number;
  emoji?: string;
  className?: string;
};

// Ligne de tentative (design/screens-dashboard-web.jsx, `QuizAttemptRow`) : un lien vers le détail (WD08), ou une
// simple ligne sans `href`.
export function QuizAttemptRow({ href, title, subtitle, status, score, total, emoji = "🎯", className }: QuizAttemptRowProps) {
  const classes = cx(
    "flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[14px] border border-ink-100 bg-surface px-4.5 py-3.5",
    href &&
      "transition hover:translate-x-0.5 hover:border-primary-200 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-500 motion-reduce:hover:translate-x-0",
    className,
  );
  const content = (
    <>
      <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-md bg-primary-100 text-[22px]">
        {emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-extrabold text-ink-900">{title}</span>
        <span className="mt-0.5 block text-xs font-semibold text-ink-600">{subtitle}</span>
      </span>
      <AttemptStatusBadge status={status} />
      <span className="min-w-14 text-right text-base font-black text-ink-900">
        {score}/{total}
        <span className="sr-only"> bonnes réponses</span>
      </span>
    </>
  );
  if (!href) return <div className={classes}>{content}</div>;
  return (
    <Link href={href} className={classes}>
      {content}
      <Icon name="chevron-right" size={18} className="text-ink-400" />
    </Link>
  );
}
