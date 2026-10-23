import Link from "next/link";

import { Icon } from "@/components/ds";
import { formatMinutes } from "@/lib/format";

export type MissionCompletionItemProps = {
  /** « Mission 2 ». */
  step: string;
  title: string;
  /** Durée en minutes saisie par l'équipe Contenu. */
  durationMin: number;
  icon?: string;
  /** Élèves actifs de l'enseignant qui ont terminé la mission, lu dans l'API. */
  completedCount: number;
  /** Mission en lecture seule. */
  href: string;
};

/** « Aucun élève ne l'a terminée », « 1 élève l'a terminée », « 12 élèves l'ont terminée ». */
export function completionLabel(count: number): string {
  if (count === 0) return "Aucun élève ne l'a terminée";
  return count === 1 ? "1 élève l'a terminée" : `${count} élèves l'ont terminée`;
}

// Mission d'un parcours encadré (WT10), dérivée de `MissionItem` : le compteur d'élèves ayant terminé a sa propre
// ligne, la durée n'est jamais détournée en compteur (§5.12, « À ne pas porter »).
export function MissionCompletionItem({ step, title, durationMin, icon, completedCount, href }: MissionCompletionItemProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3.5 rounded-lg border-2 border-ink-100 bg-surface p-3.5 hover:border-primary-200 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
    >
      <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-[16px] bg-primary-100 text-2xl">
        {icon || "🤖"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-extrabold tracking-[.04em] text-ink-600 uppercase">{step}</span>
        <span className="mt-0.5 block text-[15px] font-extrabold text-ink-900">{title}</span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2.5 text-[13px] font-semibold text-ink-600">
          <span>⏱ {formatMinutes(durationMin)}</span>
          <span className="font-extrabold text-primary-700">· {completionLabel(completedCount)}</span>
        </span>
      </span>
      <Icon name="chevron-right" size={20} className="text-ink-400" />
    </Link>
  );
}
