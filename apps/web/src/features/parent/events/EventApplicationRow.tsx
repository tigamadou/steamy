"use client";

import type { Schemas } from "@steamy/api-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Badge, Button, type PaymentFormProps, type PhoneCountry } from "@/components/ds";
import { apiCall } from "@/lib/api-call";
import { cx } from "@/lib/cx";
import { formatFullDate } from "@/lib/dates";
import { formatPrice } from "@/lib/format";
import { routes } from "@/lib/routes";

import { EventOrderPayment } from "./EventOrderPayment";
import { RefuseApplicationDialog } from "./RefuseApplicationDialog";
import { applicationErrorMessage, PARENT_APPLICATION_STATUS } from "./status";

type Application = Schemas["Application"];

export type EventApplicationRowProps = {
  application: Application;
  countries: PhoneCountry[];
  preferred?: PaymentFormProps["preferred"];
  /** Candidature ouverte depuis « À valider » ou une notification (`?candidature=<id>`) : mise en avant et focus. */
  highlighted?: boolean;
};

/**
 * Candidature d'un enfant (WPD06, D53) : événement, enfant, statut. En attente du parent : « Accepter » / « Refuser ».
 * Accepter un événement payant réserve la place et ouvre le paiement de la commande d'événement (formulaire de WPD15) ;
 * la candidature n'est acceptée qu'une fois payée (D53 amendé, S8).
 */
export function EventApplicationRow({ application: initial, countries, preferred, highlighted }: EventApplicationRowProps) {
  const router = useRouter();
  const [application, setApplication] = useState(initial);
  const [paying, setPaying] = useState(false);
  const [refusing, setRefusing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const row = useRef<HTMLElement>(null);
  const { event, learner } = application;
  const status = PARENT_APPLICATION_STATUS[application.status];
  const titleId = `candidature-${application.id}`;

  useEffect(() => {
    if (highlighted) row.current?.focus();
  }, [highlighted]);

  async function accept() {
    setPending(true);
    setError(undefined);
    const result = await apiCall((api) =>
      api.POST("/api/events/applications/{id}/accept/", { params: { path: { id: application.id } } }),
    );
    setPending(false);
    if (!result.ok) {
      setError(applicationErrorMessage(result));
      return;
    }
    setApplication(result.data);
    if (result.data.status === "pending_payment") setPaying(true);
    else router.refresh();
  }

  return (
    <article
      ref={row}
      tabIndex={highlighted ? -1 : undefined}
      aria-labelledby={titleId}
      className={cx(
        "flex flex-col gap-3 rounded-[18px] border-2 bg-surface p-4 outline-none",
        highlighted ? "border-primary-300 ring-4 ring-primary-100" : "border-ink-100",
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span aria-hidden className="text-2xl">
          {event.emoji || "🎟️"}
        </span>
        <div className="min-w-0 flex-1">
          <h3 id={titleId} className="m-0 text-[15px] font-black text-ink-900">
            <Link
              href={routes.parent.event(event.slug)}
              className="rounded-sm hover:underline focus-visible:outline-3 focus-visible:outline-primary-500"
            >
              {event.title}
            </Link>
          </h3>
          <p className="m-0 text-[13px] font-bold text-ink-600">
            {learner.firstName} · 📅 {formatFullDate(event.startsAt)} ·{" "}
            {event.price ? formatPrice(event.price) : "Gratuit"}
            {application.ticketUsed && " · 🎟️ Ticket Steamy Events"}
          </p>
          {application.motivation && (
            <p className="m-0 mt-1 text-[13px] font-semibold text-ink-700">« {application.motivation} »</p>
          )}
          {application.status === "refused" && application.refusalReason && (
            <p className="m-0 mt-1 text-[13px] font-semibold text-ink-700">Motif : {application.refusalReason}</p>
          )}
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>

      {application.status === "pending_parent" && (
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setRefusing(true)}>
            Refuser<span className="sr-only"> la candidature de {learner.firstName}</span>
          </Button>
          <Button size="sm" loading={pending} onClick={() => void accept()}>
            Accepter<span className="sr-only"> la candidature de {learner.firstName}</span>
          </Button>
        </div>
      )}
      {application.status === "pending_payment" && application.orderReference && !paying && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setPaying(true)}>
            Payer la participation<span className="sr-only"> de {learner.firstName}</span>
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="m-0 text-sm font-bold text-error-700">
          {error}
        </p>
      )}
      {paying && application.orderReference && (
        <EventOrderPayment
          orderReference={application.orderReference}
          countries={countries}
          preferred={preferred}
          success={
            <p className="m-0">
              La participation de {learner.firstName} à <strong>{event.title}</strong> est confirmée.
            </p>
          }
        />
      )}
      <RefuseApplicationDialog
        open={refusing}
        onClose={() => setRefusing(false)}
        applicationId={application.id}
        childFirstName={learner.firstName}
        eventTitle={event.title}
        onRefused={(refused) => {
          // La ligne garde sa propre copie de la candidature : elle prend celle de l'API, l'accueil se relit
          setApplication(refused);
          setRefusing(false);
          router.refresh();
        }}
      />
    </article>
  );
}
