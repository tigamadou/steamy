"use client";

import type { Schemas } from "@steamy/api-client";
import { useSearchParams } from "next/navigation";
import { startTransition, useActionState, useState, type FormEvent } from "react";

import { Button, ErrorSummary, Field, Input, Select, Textarea } from "@/components/ds";
import { throttledMessage } from "@/lib/api-errors";
import { HONEYPOT_FIELD, submitPublicForm } from "@/lib/public-forms";
import { CONTACT_SUBJECTS } from "@/lib/routes";

import { Honeypot, SentConfirmation } from "./forms";

type Subject = Schemas["SubjectEnum"];
type Fields = Partial<Record<"name" | "contact" | "subject" | "message", string>>;
type State = {
  attempt: number;
  sent?: { name: string; contact: string };
  fields?: Fields;
  failure?: string;
  offline?: boolean;
};

/** Libellés des sujets (`?sujet=` les présélectionne). */
export const SUBJECT_LABELS: Record<Subject, string> = {
  question: "Question",
  paiement: "Paiement",
  livraison: "Livraison",
  "changement-parent": "Changement de parent",
  candidature: "Candidature",
  autre: "Autre",
};

const IDS = {
  name: "contact-nom",
  contact: "contact-coordonnees",
  subject: "contact-sujet",
  message: "contact-message",
};
const LABELS: Record<keyof typeof IDS, string> = {
  name: "Nom",
  contact: "Email ou téléphone",
  subject: "Sujet",
  message: "Message",
};
/** Longueur minimale d'un message, comme l'API. */
const MESSAGE_MIN = 20;

function subjectFrom(value: string | null): Subject | "" {
  return (CONTACT_SUBJECTS as readonly string[]).includes(value ?? "") ? (value as Subject) : "";
}

/** Formulaire de contact de WL24 (D17), au vouvoiement : confirmation en place, message conservé en cas d'échec. */
export function ContactForm() {
  const [round, setRound] = useState(0);
  return <ContactFormRound key={round} onAgain={() => setRound((n) => n + 1)} />;
}

function ContactFormRound({ onAgain }: { onAgain: () => void }) {
  const fromUrl = subjectFrom(useSearchParams().get("sujet"));
  const [subject, setSubject] = useState<string>(fromUrl);
  // Un lien `?sujet=` suivi sur la même page change le sujet présélectionné
  const [lastUrlSubject, setLastUrlSubject] = useState<string>(fromUrl);
  if (lastUrlSubject !== fromUrl) {
    setLastUrlSubject(fromUrl);
    setSubject(fromUrl);
  }

  const [state, action, pending] = useActionState(
    async (previous: State, form: FormData): Promise<State> => {
      const attempt = previous.attempt + 1;
      // Tous les champs lus sont présents dans le formulaire (le champ piège compris)
      const value = (name: string) => String(form.get(name)).trim();
      const body = {
        name: value("name"),
        contact: value("contact"),
        subject: value("subject"),
        message: value("message"),
        [HONEYPOT_FIELD]: value(HONEYPOT_FIELD),
      };
      const fields: Fields = {};
      if (!body.name) fields.name = "Indiquez votre nom.";
      if (!body.contact) fields.contact = "Indiquez un email ou un numéro de téléphone.";
      if (!body.subject) fields.subject = "Choisissez un sujet.";
      if (body.message.length < MESSAGE_MIN)
        fields.message = `Votre message doit contenir au moins ${MESSAGE_MIN} caractères.`;
      if (Object.keys(fields).length > 0) return { attempt, fields };

      const result = await submitPublicForm("/api/public/contact-messages/", body);
      if (result.ok) return { attempt, sent: { name: body.name, contact: body.contact } };
      if (result.code === "THROTTLED") return { attempt, failure: throttledMessage(result.retryAfter) };
      if (result.code === "NETWORK_UNAVAILABLE") return { attempt, offline: true };
      return {
        attempt,
        fields: result.fields,
        failure: Object.keys(result.fields).length ? undefined : result.message,
      };
    },
    { attempt: 0 },
  );

  // Envoi hors `action` de formulaire : React 19 viderait les champs ; en cas d'erreur, la saisie est conservée
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => action(data));
  };

  if (state.sent) {
    return (
      <SentConfirmation
        title="Message envoyé"
        action={
          <Button variant="outline" onClick={onAgain}>
            Envoyer un autre message
          </Button>
        }
      >
        Merci {state.sent.name}. Notre équipe vous répondra à <strong>{state.sent.contact}</strong>.
      </SentConfirmation>
    );
  }

  const errors = [
    ...(Object.keys(IDS) as Array<keyof typeof IDS>)
      .filter((key) => state.fields?.[key])
      .map((key) => ({ field: IDS[key], message: `${LABELS[key]} : ${state.fields![key]}` })),
    ...(state.failure ? [{ message: state.failure }] : []),
  ];

  return (
    <form onSubmit={submit} noValidate className="relative flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-black text-ink-900">Nous contacter</h2>
        <p className="mt-1 text-sm font-semibold text-ink-600">Tous les champs sont obligatoires.</p>
      </div>
      <ErrorSummary title="Votre message n'a pas pu être envoyé :" errors={errors} focusKey={state.attempt} />
      {state.offline && (
        <p
          role="alert"
          className="flex gap-2.5 rounded-[14px] border-2 border-amber-200 bg-amber-50 px-3.5 py-3 text-[13px] leading-normal font-bold text-ink-700"
        >
          <span aria-hidden>⚠️</span>
          <span>
            Votre message n&apos;a pas pu être envoyé (connexion interrompue). Il est conservé ci-dessous :{" "}
            <strong>réessayez dans un instant</strong>.
          </span>
        </p>
      )}
      <Honeypot />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nom" id={IDS.name} required error={state.fields?.name}>
          <Input name="name" autoComplete="name" placeholder="Votre nom" />
        </Field>
        <Field label="Email ou téléphone" id={IDS.contact} required error={state.fields?.contact}>
          <Input name="contact" autoComplete="email" />
        </Field>
      </div>
      <Field
        label="Sujet"
        id={IDS.subject}
        required
        error={state.fields?.subject}
        hint={
          subject === "candidature" && fromUrl === "candidature"
            ? "Présélectionné depuis « Rejoindre l'équipe »."
            : undefined
        }
      >
        <Select name="subject" value={subject} onChange={(event) => setSubject(event.target.value)}>
          <option value="">Choisissez un sujet</option>
          {CONTACT_SUBJECTS.map((value) => (
            <option key={value} value={value}>
              {SUBJECT_LABELS[value]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Message" id={IDS.message} required error={state.fields?.message}>
        <Textarea name="message" rows={5} />
      </Field>
      <div className="flex flex-col items-start gap-3.5 sm:flex-row sm:items-center">
        <Button type="submit" size="lg" icon="mail" loading={pending}>
          {state.offline ? "Réessayer l'envoi" : "Envoyer"}
        </Button>
        <p className="text-xs leading-normal font-bold text-ink-600">
          Vos coordonnées servent uniquement à vous répondre (voir la politique de confidentialité).
        </p>
      </div>
    </form>
  );
}
