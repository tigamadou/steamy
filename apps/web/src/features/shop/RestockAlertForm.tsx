"use client";

import { useEffect, useState, type FormEvent } from "react";

import { Button, Field, PhoneInput, type PhoneChange } from "@/components/ds";
import { errorMessage } from "@/lib/api-call";
import { useReferential } from "@/lib/use-referential";

import { probeShopper, requestRestockAlert, type Shopper } from "./api";
import type { ShopContext } from "./AddToCartButton";

const COPY: Record<Shopper, { intro: string; done: string }> = {
  learner: {
    intro: "Tu recevras une notification dans l'appli dès que ce kit sera de retour.",
    done: "C'est noté : tu recevras une notification dès son retour.",
  },
  parent: {
    intro: "Recevez un SMS sur le numéro de votre compte dès que ce kit sera de retour.",
    done: "C'est noté : un SMS vous sera envoyé dès son retour.",
  },
  guest: {
    intro: "Laissez votre numéro : un seul SMS vous sera envoyé dès que ce kit sera de retour.",
    done: "C'est noté : un SMS vous sera envoyé dès son retour.",
  },
};

/**
 * Alerte de réassort (WK11, D38). Invité : numéro de téléphone (`PhoneInput`). Parent connecté : SMS sur son numéro,
 * sans champ. Apprenant : notification dans l'application, **jamais de champ téléphone** (D30).
 */
export function RestockAlertForm({ slug, context }: { slug: string; context: ShopContext }) {
  // Boutique publique en cache : la session est lue dans le navigateur
  const [probed, setProbed] = useState<Shopper | null>(null);
  useEffect(() => {
    if (context === "learner") return;
    let current = true;
    probeShopper().then((shopper) => current && setProbed(shopper));
    return () => {
      current = false;
    };
  }, [context]);
  const shopper = context === "learner" ? "learner" : probed;

  const [phone, setPhone] = useState<PhoneChange | null>(null);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const countries = useReferential("countries", {});

  if (!shopper) return <p className="text-sm font-semibold text-ink-600">Chargement…</p>;
  const copy = COPY[shopper];
  const tu = shopper === "learner";

  if (done) {
    return (
      <p role="status" className="rounded-[14px] bg-success-50 p-3.5 text-sm font-bold text-success-800">
        {copy.done}
      </p>
    );
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (shopper === "guest" && !phone?.valid) {
      setError("Saisissez un numéro de téléphone valide.");
      return;
    }
    setError(undefined);
    setPending(true);
    const result = await requestRestockAlert(slug, shopper === "guest" ? phone!.e164! : undefined);
    setPending(false);
    if (result.ok) setDone(true);
    else setError(result.fields.phone ?? errorMessage(result, tu ? "tu" : "vous"));
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-ink-700">{copy.intro}</p>
      {shopper === "guest" ? (
        <Field label="Votre numéro de téléphone" id="reassort-telephone" required error={error}>
          <PhoneInput countries={countries.items ?? []} onChange={setPhone} />
        </Field>
      ) : (
        error && (
          <p role="alert" className="text-sm font-bold text-error-700">
            {error}
          </p>
        )
      )}
      <Button type="submit" variant="amber" icon="bell" block loading={pending}>
        {tu ? "Préviens-moi" : "Me prévenir"}
      </Button>
    </form>
  );
}
