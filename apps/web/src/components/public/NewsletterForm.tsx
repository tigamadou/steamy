"use client";

import { startTransition, useActionState, type FormEvent } from "react";

import { Button, Checkbox, ErrorSummary, Field, Input } from "@/components/ds";
import { throttledMessage } from "@/lib/api-errors";
import { HONEYPOT_FIELD, submitPublicForm } from "@/lib/public-forms";

import { Honeypot } from "./forms";

type Fields = Partial<Record<"email" | "isAdult" | "newsletterConsent", string>>;
type State = { attempt: number; sent?: boolean; fields?: Fields; failure?: string };

const IDS = { email: "newsletter-email", isAdult: "newsletter-adulte", newsletterConsent: "newsletter-consentement" };
const LABELS: Record<keyof typeof IDS, string> = {
  email: "Email",
  isAdult: "Âge",
  newsletterConsent: "Consentement",
};
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Encart newsletter de WL20 (D14), facultatif : les guides restent téléchargeables sans email. Réservé aux adultes
 * (C12), au vouvoiement, consentement explicite par une case non cochée.
 */
export function NewsletterForm() {
  const [state, action, pending] = useActionState(
    async (previous: State, form: FormData): Promise<State> => {
      const attempt = previous.attempt + 1;
      const body = {
        email: String(form.get("email")).trim(),
        isAdult: form.get("isAdult") === "on",
        newsletterConsent: form.get("newsletterConsent") === "on",
        source: "guides",
        [HONEYPOT_FIELD]: String(form.get(HONEYPOT_FIELD)),
      };
      const fields: Fields = {};
      if (!EMAIL.test(body.email)) fields.email = "Indiquez une adresse email valide.";
      if (!body.isAdult) fields.isAdult = "La newsletter est réservée aux adultes.";
      if (!body.newsletterConsent) fields.newsletterConsent = "Votre consentement est nécessaire.";
      if (Object.keys(fields).length > 0) return { attempt, fields };

      const result = await submitPublicForm("/api/public/leads/", body);
      if (result.ok) return { attempt, sent: true };
      if (result.code === "THROTTLED") return { attempt, failure: throttledMessage(result.retryAfter) };
      return {
        attempt,
        fields: result.fields,
        failure: Object.keys(result.fields).length ? undefined : result.message,
      };
    },
    { attempt: 0 },
  );

  if (state.sent) {
    return (
      <p
        role="status"
        tabIndex={-1}
        ref={(node) => node?.focus()}
        className="rounded-[14px] border-2 border-success-200 bg-success-50 px-3.5 py-3 text-sm font-bold text-success-800 outline-none"
      >
        ✅ C&apos;est noté ! Vous recevrez nos prochains guides par email. Désinscription en 1 clic depuis chaque envoi.
      </p>
    );
  }

  const errors = [
    ...(Object.keys(IDS) as Array<keyof typeof IDS>)
      .filter((key) => state.fields?.[key])
      .map((key) => ({ field: IDS[key], message: `${LABELS[key]} : ${state.fields![key]}` })),
    ...(state.failure ? [{ message: state.failure }] : []),
  ];

  // Envoi hors `<form action>` : React 19 viderait les champs, la saisie doit survivre à une erreur
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => action(data));
  };

  return (
    <form onSubmit={submit} noValidate className="relative flex flex-col gap-3.5">
      <ErrorSummary title="Inscription impossible :" errors={errors} focusKey={state.attempt} />
      <Honeypot />
      <Field label="Votre email" id={IDS.email} required error={state.fields?.email}>
        <Input name="email" type="email" autoComplete="email" placeholder="vous@exemple.bj" />
      </Field>
      <Checkbox
        id={IDS.isAdult}
        name="isAdult"
        label="J'ai 18 ans ou plus (parent, enseignant…)."
        error={state.fields?.isAdult}
      />
      <Checkbox
        id={IDS.newsletterConsent}
        name="newsletterConsent"
        label="J'accepte de recevoir la newsletter de Steamy : nouveaux guides et actualités."
        error={state.fields?.newsletterConsent}
      />
      <Button type="submit" block loading={pending}>
        Recevoir les guides
      </Button>
      <p className="text-xs font-bold text-ink-600">Zéro spam. Désinscription en 1 clic.</p>
    </form>
  );
}
