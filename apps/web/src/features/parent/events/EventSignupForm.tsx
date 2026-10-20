"use client";

import type { Schemas } from "@steamy/api-client";
import { useState, type FormEvent } from "react";

import { Button, ErrorSummary, Field, Select, Textarea, type PaymentFormProps, type PhoneCountry } from "@/components/ds";
import { apiCall } from "@/lib/api-call";
import { formatPrice } from "@/lib/format";
import { routes } from "@/lib/routes";

import { EventOrderPayment } from "./EventOrderPayment";
import { applicationErrorMessage } from "./status";

type Child = Pick<Schemas["Child"], "id" | "firstName" | "lastName">;

export type EventSignupFormProps = {
  event: Pick<Schemas["SteamyEventDetail"], "slug" | "title" | "price">;
  /** Enfants actifs du parent (les comptes désactivés sont exclus par l'appelant). */
  kids: Child[];
  countries: PhoneCountry[];
  preferred?: PaymentFormProps["preferred"];
};

type Outcome = { kind: "accepted"; firstName: string } | { kind: "payment"; reference: string; firstName: string };

/**
 * WPD12 · inscription d'un enfant par le parent (D53, S8) : enfant actif, motivation facultative ; l'accord parental est
 * acquis. Gratuit (ou ticket de l'enfant) : inscription confirmée. Payant : la place est réservée par une commande
 * d'événement, payée aussitôt avec le formulaire de WPD15.
 */
export function EventSignupForm({ event, kids, countries, preferred }: EventSignupFormProps) {
  const [childId, setChildId] = useState(kids.length === 1 ? String(kids[0].id) : "");
  const [motivation, setMotivation] = useState("");
  const [error, setError] = useState<{ field?: string; message: string }>();
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>();
  const paid = !!event.price;

  async function submit(form: FormEvent) {
    form.preventDefault();
    if (pending) return;
    setAttempt((n) => n + 1);
    const child = kids.find((kid) => String(kid.id) === childId);
    if (!child) {
      setError({ field: "inscription-enfant", message: "Choisissez l'enfant à inscrire." });
      return;
    }
    setError(undefined);
    setPending(true);
    const result = await apiCall((api) =>
      api.POST("/api/events/{slug}/applications/", {
        params: { path: { slug: event.slug } },
        body: { childId: child.id, motivation: motivation.trim(), selfLevel: "" },
      }),
    );
    setPending(false);
    if (!result.ok) {
      setError({ message: applicationErrorMessage(result) });
      return;
    }
    setOutcome(
      result.data.status === "pending_payment" && result.data.orderReference
        ? { kind: "payment", reference: result.data.orderReference, firstName: child.firstName }
        : { kind: "accepted", firstName: child.firstName },
    );
  }

  if (outcome?.kind === "accepted") {
    return (
      <section
        aria-labelledby="inscription-confirmee"
        className="flex flex-col items-center gap-3 rounded-[22px] border-[3px] border-success-500 bg-surface px-6 py-8 text-center"
      >
        <h2 id="inscription-confirmee" className="m-0 text-2xl font-black text-success-700">
          Inscription confirmée
        </h2>
        <p className="m-0 text-sm font-semibold text-ink-700">
          {outcome.firstName} participera à <strong>{event.title}</strong>. Vous retrouverez sa participation dans
          « Demandes de mes enfants ».
        </p>
        <Button href={routes.parent.events}>Voir les événements</Button>
      </section>
    );
  }
  if (outcome?.kind === "payment") {
    return (
      <EventOrderPayment
        orderReference={outcome.reference}
        countries={countries}
        preferred={preferred}
        success={
          <p className="m-0">
            La participation de {outcome.firstName} à <strong>{event.title}</strong> est confirmée.
          </p>
        }
      />
    );
  }

  return (
    <form
      onSubmit={(form) => void submit(form)}
      noValidate
      aria-label="Inscrire un enfant"
      className="flex flex-col gap-4 rounded-[22px] border-2 border-ink-100 bg-surface p-4 sm:p-5.5"
    >
      <ErrorSummary title="Corrigez les erreurs suivantes :" errors={error ? [error] : []} focusKey={attempt} />
      <Field label="Enfant" id="inscription-enfant" required error={error?.field ? error.message : undefined}>
        <Select value={childId} onChange={(change) => setChildId(change.target.value)}>
          <option value="">Choisissez l&apos;enfant</option>
          {kids.map((kid) => (
            <option key={kid.id} value={kid.id}>
              {kid.firstName} {kid.lastName}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Motivation (facultatif)" hint="Ce que votre enfant attend de l'événement.">
        <Textarea value={motivation} onChange={(change) => setMotivation(change.target.value)} maxLength={1000} rows={3} />
      </Field>
      <p className="m-0 rounded-[14px] bg-ink-50 px-4 py-3 text-[13px] font-bold text-ink-700">
        {paid
          ? `Participation : ${formatPrice(event.price ?? 0)}. La place est réservée dès que vous continuez, puis confirmée au paiement ; si votre enfant a un ticket Steamy Events, il est utilisé et il n'y a rien à payer.`
          : "Participation gratuite. Votre accord de parent est acquis : l'inscription est confirmée dans la limite des places."}
      </p>
      <Button type="submit" block size="lg" loading={pending}>
        {paid ? "Continuer" : "Confirmer l'inscription"}
      </Button>
    </form>
  );
}
