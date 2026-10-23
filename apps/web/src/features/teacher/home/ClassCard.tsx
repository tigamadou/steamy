import type { Schemas } from "@steamy/api-client";
import Link from "next/link";

import { Icon, ProgressBar } from "@/components/ds";
import { routes } from "@/lib/routes";

type Classroom = Schemas["Classroom"];

/** « 12 élèves », « 1 élève », « Aucun élève » (comptes lus dans l'API). */
export function memberCountLabel(count: number): string {
  if (count === 0) return "Aucun élève";
  return `${count} élève${count > 1 ? "s" : ""}`;
}

/** « 2 invitations en attente », « 1 invitation en attente » ; vide sans invitation. */
export function pendingInvitationsLabel(count: number): string {
  if (count === 0) return "";
  return `${count} invitation${count > 1 ? "s" : ""} en attente`;
}

/** Carte d'une classe (WT01, WT03) : parcours, élèves et invitations en attente, progression moyenne → WT04. */
export function ClassCard({ classroom }: { classroom: Classroom }) {
  const pending = pendingInvitationsLabel(classroom.pendingInvitationCount);
  return (
    <Link
      href={routes.teacher.classroom(classroom.id)}
      className="group flex flex-col gap-3 rounded-[18px] border-[1.5px] border-ink-100 bg-surface p-4.5 hover:border-ink-200 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
    >
      <span className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex size-11 shrink-0 items-center justify-center rounded-md text-xl"
          style={{ backgroundColor: classroom.color }}
        >
          {classroom.course.emoji}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[15px] font-black text-ink-900">{classroom.name}</span>
          <span className="truncate text-xs font-bold text-ink-600">{classroom.course.title}</span>
        </span>
        <Icon name="chevron-right" size={18} className="text-ink-500 group-hover:text-ink-700" />
      </span>
      <span className="text-xs font-bold text-ink-700">
        {memberCountLabel(classroom.memberCount)}
        {pending && ` · ${pending}`}
      </span>
      <ProgressBar value={classroom.averageProgress} label="Progression moyenne" showLabel />
    </Link>
  );
}
