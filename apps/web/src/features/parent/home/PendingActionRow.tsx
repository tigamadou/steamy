import type { Schemas } from "@steamy/api-client";

import { Button, type ButtonProps } from "@/components/ds";
import { notificationTarget } from "@/features/notifications/notification-icon";
import { formatInstant } from "@/lib/dates";
import { routes } from "@/lib/routes";

export type PendingAction = Schemas["PendingAction"];
type PendingActionType = Schemas["PendingActionTypeEnum"];

type Kind = {
  icon: string;
  title: string;
  body: (firstName: string) => string;
  cta: string;
  variant: NonNullable<ButtonProps["variant"]>;
  /** Route de repli quand l'API ne donne pas d'`url` utilisable. */
  fallback: (action: PendingAction) => string;
};

const p = routes.parent;

/** Les 4 types de « À valider » (D52, §4.2) : pictogramme, libellé, CTA et écran cible. */
export const PENDING_KINDS: Record<PendingActionType, Kind> = {
  consent: {
    icon: "✍️",
    title: "Demande de consentement",
    body: (name) => `${name} souhaite s'inscrire sur Steamy et attend votre accord.`,
    cta: "Examiner",
    variant: "secondary",
    fallback: ({ id }) => p.consent(id),
  },
  payment_request: {
    icon: "💳",
    title: "Demande de paiement",
    body: (name) => `${name} vous demande de régler un achat.`,
    cta: "Payer",
    // C1 : l'action de paiement est en magenta (primaire)
    variant: "primary",
    fallback: ({ id }) => p.paymentRequest(id),
  },
  event_application: {
    icon: "🎟️",
    title: "Candidature à un Steamy Event",
    body: (name) => `${name} souhaite participer à un événement et attend votre accord.`,
    cta: "Examiner",
    variant: "secondary",
    fallback: () => p.events,
  },
  deletion_request: {
    icon: "🗑️",
    title: "Demande de suppression du compte",
    body: (name) => `${name} demande la suppression de son compte.`,
    cta: "Examiner",
    variant: "secondary",
    fallback: ({ id, childId }) => (childId === null ? p.children : p.deleteChild(childId, id)),
  },
};

/** Écran où traiter la demande : l'`url` de l'API (route du front), sinon la route de son type. */
export function pendingActionHref(action: PendingAction): string {
  return notificationTarget(action.url) ?? PENDING_KINDS[action.type].fallback(action);
}

/** Ligne de « À valider » (WPD01) : enfant, objet et date de la demande, CTA vers l'écran qui la traite. */
export function PendingActionRow({ action }: { action: PendingAction }) {
  const kind = PENDING_KINDS[action.type];
  const child = [action.childFirstName, action.childLastName].filter(Boolean).join(" ");
  const titleId = `a-valider-${action.type}-${action.id}`;
  return (
    <article
      aria-labelledby={titleId}
      className="flex flex-col gap-3 rounded-[18px] border-2 border-amber-300 bg-amber-50 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-4.5"
    >
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <span
          aria-hidden
          className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-amber-100 text-2xl"
        >
          {kind.icon}
        </span>
        <div className="min-w-0 flex-1">
          <h3 id={titleId} className="m-0 text-[15px] font-black text-ink-900">
            {kind.title}
            {child && <> · {child}</>}
          </h3>
          <p className="m-0 text-[13px] font-semibold text-ink-700">{kind.body(action.childFirstName || "Votre enfant")}</p>
          <p className="m-0 mt-0.5 text-xs font-bold text-ink-600">
            Reçue le <time dateTime={action.createdAt}>{formatInstant(action.createdAt)}</time>
          </p>
        </div>
      </div>
      <Button href={pendingActionHref(action)} variant={kind.variant} className="self-end sm:self-auto">
        {kind.cta}
        <span className="sr-only"> : {kind.title.toLowerCase()}{child && ` de ${child}`}</span>
      </Button>
    </article>
  );
}
