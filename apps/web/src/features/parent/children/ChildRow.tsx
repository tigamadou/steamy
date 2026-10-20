import type { Schemas } from "@steamy/api-client";
import type { ReactNode } from "react";

import { Avatar, Badge, Button } from "@/components/ds";
import { activeCoursesLabel, childMeta } from "@/features/parent/home/ChildCard";
import { CancelDeletionButton } from "@/features/parent/deletion/CancelDeletionButton";
import { pendingActionHref, type PendingAction } from "@/features/parent/home/PendingActionRow";
import { formatInstant } from "@/lib/dates";
import { routes } from "@/lib/routes";

type Child = Schemas["Child"];

/**
 * Ligne de WPD02 : un enfant rattaché, ou une demande de consentement reçue (D50) dont l'enfant n'est pas encore
 * rattaché.
 */
export type ChildListItem = { kind: "child"; child: Child } | { kind: "consent"; action: PendingAction };

export function fullName(person: { firstName: string; lastName: string }): string {
  return `${person.firstName} ${person.lastName}`.trim();
}

/** Badge d'une suppression en cours (D54) : programmée (« Supprimé le … ») ou demandée par l'enfant (WD15). */
function DeletionBadge({ deletion }: { deletion: NonNullable<Child["deletion"]> }) {
  if (deletion.status === "pending_parent") return <Badge tone="amber">Suppression demandée</Badge>;
  return (
    <Badge tone="error">
      {deletion.scheduledFor ? (
        <>
          Supprimé le <time dateTime={deletion.scheduledFor}>{formatInstant(deletion.scheduledFor)}</time>
        </>
      ) : (
        "Suppression programmée"
      )}
    </Badge>
  );
}

function RowFrame({
  titleId,
  name,
  emoji,
  ring,
  badge,
  children,
  actions,
}: {
  titleId: string;
  name: string;
  emoji?: string;
  ring?: boolean;
  badge?: ReactNode;
  children: ReactNode;
  actions: ReactNode;
}) {
  return (
    <article
      id={`${titleId}-ligne`}
      tabIndex={-1}
      aria-labelledby={titleId}
      className="flex flex-col gap-3 rounded-[18px] border-[1.5px] border-ink-100 bg-surface p-4 outline-none focus:ring-4 focus:ring-primary-100 sm:flex-row sm:items-center sm:gap-4 sm:p-4.5"
    >
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <Avatar name={name} emoji={emoji} size={56} ring={ring} decorative />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 id={titleId} className="m-0 text-base font-black text-ink-900">
              {name}
            </h3>
            {badge}
          </div>
          {children}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 self-end sm:self-auto">{actions}</div>
    </article>
  );
}

/**
 * Ligne de WPD02 (§5.11) : enfant **actif** (âge · classe, parcours en cours, « Voir le profil » → WPD03), **demande
 * à examiner** (consentement reçu, « Examiner » → WPD05, sans progression) ou **suppression programmée** (badge
 * « Supprimé le … », « Annuler la suppression »). Pas de « Relancer l'invitation » (D50).
 */
export function ChildRow({ item }: { item: ChildListItem }) {
  if (item.kind === "consent") {
    const { action } = item;
    const name = fullName({ firstName: action.childFirstName, lastName: action.childLastName });
    return (
      <RowFrame
        titleId={`demande-${action.id}`}
        name={name}
        badge={<Badge tone="amber">Demande à examiner</Badge>}
        actions={
          <Button href={pendingActionHref(action)} variant="secondary">
            Examiner<span className="sr-only"> la demande de {name}</span>
          </Button>
        }
      >
        <p className="m-0 mt-0.5 text-[13px] font-bold text-ink-600">
          Reçue le <time dateTime={action.createdAt}>{formatInstant(action.createdAt)}</time>
        </p>
      </RowFrame>
    );
  }

  const { child } = item;
  const name = fullName(child);
  const meta = childMeta(child);
  const { deletion } = child;
  return (
    <RowFrame
      titleId={`enfant-${child.id}`}
      name={name}
      emoji={child.avatar?.emoji}
      ring={child.status === "active"}
      badge={deletion && <DeletionBadge deletion={deletion} />}
      actions={
        <>
          {deletion?.status === "scheduled" && (
            <CancelDeletionButton
              childId={child.id}
              firstName={child.firstName}
              redirectTo={routes.parent.deletionCancelled(child.id)}
            />
          )}
          {deletion?.status === "pending_parent" && (
            <Button href={routes.parent.deleteChild(child.id, deletion.id)} variant="secondary">
              Examiner<span className="sr-only"> la demande de suppression de {name}</span>
            </Button>
          )}
          <Button href={routes.parent.child(child.id)} variant="outline">
            Voir le profil<span className="sr-only"> de {name}</span>
          </Button>
        </>
      }
    >
      {meta && <p className="m-0 mt-0.5 text-[13px] font-bold text-ink-600">{meta}</p>}
      <p className="m-0 mt-1 text-[13px] font-bold text-ink-700">{activeCoursesLabel(child.activeCourses)}</p>
    </RowFrame>
  );
}
