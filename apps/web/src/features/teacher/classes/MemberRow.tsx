import type { Schemas } from "@steamy/api-client";
import Link from "next/link";

import { Avatar, Badge, Icon, ProgressBar } from "@/components/ds";
import { formatInstant, formatRelative } from "@/lib/dates";
import { routes } from "@/lib/routes";

import { RemoveMemberButton } from "./RemoveMemberButton";

type Member = Schemas["Member"];

const ROW = "flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[14px] border border-ink-100 bg-surface px-4.5 py-3.5";

/** Élève actif (WT04) : dernière activité, progression et badge « Décrochage » du serveur (D66) → WT05. */
export function MemberRow({ member, classroomId }: { member: Member; classroomId: number }) {
  const learner = member.learner;
  const name = `${member.firstName} ${member.lastName}`.trim();
  const content = (
    <>
      <Avatar name={name} emoji={learner?.avatar?.emoji} size={44} decorative />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-extrabold text-ink-900">{name}</span>
          {member.isDropout && <Badge tone="amber">Décrochage</Badge>}
        </span>
        <span className="block text-xs font-semibold text-ink-600">
          {member.lastActivityAt ? `Dernière activité ${formatRelative(member.lastActivityAt)}` : "Pas encore d'activité"}
        </span>
      </span>
      {member.progressPct !== null && (
        <span className="w-full sm:w-40">
          <ProgressBar value={member.progressPct} label={`Progression : ${name}`} showLabel />
        </span>
      )}
    </>
  );
  return (
    <div className={ROW}>
      {learner ? (
        <Link
          href={routes.teacher.learner(learner.id, { classroomId })}
          className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2 rounded-sm focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
        >
          {content}
          <Icon name="chevron-right" size={18} className="text-ink-500" />
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2">{content}</div>
      )}
      <RemoveMemberButton classroomId={classroomId} memberId={member.id} name={name} invitation={false} />
    </div>
  );
}

/** Texte de l'état d'une invitation, tel que l'API le décrit : en attente, refusée ou expirée. */
export function invitationLabel(member: Pick<Member, "invitationStatus">): string {
  if (member.invitationStatus === "refused") return "Refusée";
  if (member.invitationStatus === "expired") return "Expirée";
  return "En attente du parent";
}

/** Invitation (WT04) : prénom et nom saisis, état de la demande au parent, date ; jamais son numéro. */
export function InvitationRow({ member, classroomId }: { member: Member; classroomId: number }) {
  const name = `${member.firstName} ${member.lastName}`.trim();
  const pending = member.invitationStatus === "pending";
  const tone = member.invitationStatus === "refused" ? "error" : member.invitationStatus === "expired" ? "amber" : "info";
  return (
    <div className={ROW}>
      <Avatar name={name} size={44} decorative />
      <div className="min-w-0 flex-1">
        <p className="m-0 text-sm font-extrabold text-ink-900">{name}</p>
        <p className="m-0 text-xs font-semibold text-ink-600">
          Invitation envoyée le {formatInstant(member.createdAt)}
          {pending && member.invitationExpiresAt && ` · expire le ${formatInstant(member.invitationExpiresAt)}`}
        </p>
      </div>
      <Badge tone={tone}>{invitationLabel(member)}</Badge>
      <RemoveMemberButton classroomId={classroomId} memberId={member.id} name={name} invitation />
    </div>
  );
}
