"use client";

import type { Schemas } from "@steamy/api-client";
import { useSearchParams } from "next/navigation";
import { startTransition, useActionState, useState, type FormEvent } from "react";

import { Button, ErrorSummary, Field, Input, PhoneInput, Select, Textarea, type PhoneChange } from "@/components/ds";
import { schoolOffers } from "@/content/site";
import { throttledMessage } from "@/lib/api-errors";
import { HONEYPOT_FIELD, submitPublicForm } from "@/lib/public-forms";

import { Honeypot, SentConfirmation } from "./forms";

type Fields = Partial<Record<"schoolName" | "contactName" | "email" | "phone" | "offer" | "message", string>>;
type State = { attempt: number; sent?: { email: string }; fields?: Fields; failure?: string };

// Identifiants des champs (liens du récapitulatif d'erreurs)
const IDS = {
  schoolName: "devis-etablissement",
  contactName: "devis-contact",
  email: "devis-email",
  phone: "devis-telephone",
  offer: "devis-offre",
  message: "devis-message",
} as const;

const LABELS: Record<keyof typeof IDS, string> = {
  schoolName: "Établissement",
  contactName: "Personne à contacter",
  email: "Email",
  phone: "Téléphone",
  offer: "Offre",
  message: "Message",
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OFFERS: readonly string[] = schoolOffers.map((offer) => offer.slug);

/** Offre présélectionnée par `?offre=` (CTA « Choisir »), si elle existe. */
function offerFrom(value: string | null): string {
  return value && OFFERS.includes(value) ? value : "";
}

/**
 * Formulaire de devis de WL11 (D13), au vouvoiement : tout CTA d'offre y mène avec l'offre présélectionnée.
 * Confirmation en place ; l'équipe est notifiée par email côté API.
 */
export function QuoteForm({ countries }: { countries: Schemas["Country"][] }) {
  // « Envoyer une autre demande » remonte un formulaire vierge
  const [round, setRound] = useState(0);
  return <QuoteFormRound key={round} countries={countries} onAgain={() => setRound((n) => n + 1)} />;
}

function QuoteFormRound({ countries, onAgain }: { countries: Schemas["Country"][]; onAgain: () => void }) {
  const searchParams = useSearchParams();
  const fromUrl = offerFrom(searchParams.get("offre"));
  const [offer, setOffer] = useState(fromUrl);
  const [phone, setPhone] = useState<PhoneChange>();

  // « Choisir » sur la même page change l'URL sans remonter le formulaire : l'offre suit l'URL
  const [lastUrlOffer, setLastUrlOffer] = useState(fromUrl);
  if (lastUrlOffer !== fromUrl) {
    setLastUrlOffer(fromUrl);
    setOffer(fromUrl);
  }

  const [state, action, pending] = useActionState(
    async (previous: State, form: FormData): Promise<State> => {
      const attempt = previous.attempt + 1;
      // Tous les champs lus sont présents dans le formulaire (le champ piège compris)
      const value = (name: string) => String(form.get(name)).trim();
      const body = {
        schoolName: value("schoolName"),
        contactName: value("contactName"),
        email: value("email"),
        phone: phone?.e164 ?? "",
        offer: value("offer"),
        message: value("message"),
        [HONEYPOT_FIELD]: value(HONEYPOT_FIELD),
      };
      const fields: Fields = {};
      if (!body.schoolName) fields.schoolName = "Indiquez le nom de l'établissement.";
      if (!body.contactName) fields.contactName = "Indiquez la personne à contacter.";
      if (!EMAIL.test(body.email)) fields.email = "Indiquez une adresse email valide.";
      if (!phone?.valid) fields.phone = "Indiquez un numéro de téléphone valide.";
      if (Object.keys(fields).length > 0) return { attempt, fields };

      const result = await submitPublicForm("/api/public/quote-requests/", body);
      if (result.ok) return { attempt, sent: { email: body.email } };
      if (result.code === "THROTTLED") return { attempt, failure: throttledMessage(result.retryAfter) };
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
        title="Demande envoyée"
        action={
          <Button variant="outline" onClick={onAgain}>
            Envoyer une autre demande
          </Button>
        }
      >
        Merci ! Notre équipe vous répondra à <strong>{state.sent.email}</strong>.
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
    <form onSubmit={submit} noValidate className="relative flex flex-col gap-3.5">
      <h3 className="text-lg font-black text-ink-900">Demander un devis</h3>
      <ErrorSummary title="Votre demande n'a pas pu être envoyée :" errors={errors} focusKey={state.attempt} />
      <Honeypot />
      <Field label="Nom de l'établissement" id={IDS.schoolName} required error={state.fields?.schoolName}>
        <Input name="schoolName" autoComplete="organization" placeholder="Collège Les Pépinières" />
      </Field>
      <Field label="Personne à contacter" id={IDS.contactName} required error={state.fields?.contactName}>
        <Input name="contactName" autoComplete="name" placeholder="Nom et prénom" />
      </Field>
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label="Email" id={IDS.email} required error={state.fields?.email}>
          <Input name="email" type="email" autoComplete="email" icon="mail" placeholder="ecole@exemple.bj" />
        </Field>
        <Field label="Téléphone" id={IDS.phone} required error={state.fields?.phone}>
          <PhoneInput countries={countries} onChange={setPhone} />
        </Field>
      </div>
      <Field label="Offre" id={IDS.offer} error={state.fields?.offer}>
        <Select name="offer" value={offer} onChange={(event) => setOffer(event.target.value)}>
          <option value="">Je ne sais pas encore</option>
          {schoolOffers.map((item) => (
            <option key={item.slug} value={item.slug}>
              {item.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field
        label="Message"
        id={IDS.message}
        hint="Facultatif : nombre de classes, calendrier…"
        error={state.fields?.message}
      >
        <Textarea name="message" rows={4} />
      </Field>
      <Button type="submit" block size="lg" loading={pending}>
        Envoyer la demande
      </Button>
      <p className="text-xs leading-normal font-bold text-ink-600">
        Vos coordonnées servent uniquement à vous répondre (voir la politique de confidentialité).
      </p>
    </form>
  );
}
