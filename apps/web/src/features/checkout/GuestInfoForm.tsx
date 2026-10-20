"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

import { Button, Checkbox, ErrorSummary, Field, Input, PhoneInput, type PhoneChange } from "@/components/ds";
import { submitWith } from "@/lib/form";
import { routes } from "@/lib/routes";
import { useReferential } from "@/lib/use-referential";

import { readCheckout, updateCheckout } from "./checkout-storage";

type State = { attempt: number; firstName?: string; lastName?: string; phone?: string; terms?: string };

/**
 * WK04 · Coordonnées de l'invité (D12) : prénom, nom, téléphone (suivi par SMS), acceptation des CGU et de la
 * politique de confidentialité (WL09). Gardées dans l'onglet jusqu'à la commande ; « Se connecter » ramène au panier
 * fusionné (W16).
 */
export function GuestInfoForm() {
  const router = useRouter();
  const { items: countries = [] } = useReferential("countries");
  const [saved] = useState(() => readCheckout().guest);
  const [phone, setPhone] = useState<PhoneChange | null>(null);

  const [state, action] = useActionState((previous: State, form: FormData): State => {
    const attempt = previous.attempt + 1;
    const firstName = String(form.get("firstName")).trim();
    const lastName = String(form.get("lastName")).trim();
    const e164 = String(form.get("phone"));
    const errors: State = { attempt };
    if (!firstName) errors.firstName = "Indiquez votre prénom.";
    if (!lastName) errors.lastName = "Indiquez votre nom.";
    if (!e164) errors.phone = "Indiquez un numéro de téléphone valide.";
    if (form.get("terms") !== "on") errors.terms = "Acceptez les conditions pour continuer.";
    if (errors.firstName || errors.lastName || errors.phone || errors.terms) return errors;
    updateCheckout({
      guest: {
        firstName,
        lastName,
        phone: e164,
        phoneCountry: phone?.country ?? saved!.phoneCountry,
        phoneNational: phone?.national ?? saved!.phoneNational,
      },
    });
    router.push(routes.checkout.delivery);
    return { attempt };
  }, { attempt: 0 });

  const errors = [
    state.firstName && { field: "invite-prenom", message: state.firstName },
    state.lastName && { field: "invite-nom", message: state.lastName },
    state.phone && { field: "invite-telephone", message: state.phone },
    state.terms && { field: "invite-cgu", message: state.terms },
  ].filter((item) => !!item);

  return (
    <form onSubmit={submitWith(action)} noValidate className="flex flex-col gap-4">
      <p className="text-sm font-semibold text-ink-600">
        Pas besoin de compte pour commander : un SMS vous permettra de suivre la livraison.
      </p>
      <ErrorSummary title="Corrigez les erreurs suivantes :" errors={errors} focusKey={state.attempt} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prénom" id="invite-prenom" required error={state.firstName}>
          <Input name="firstName" autoComplete="given-name" defaultValue={saved?.firstName} />
        </Field>
        <Field label="Nom" id="invite-nom" required error={state.lastName}>
          <Input name="lastName" autoComplete="family-name" defaultValue={saved?.lastName} />
        </Field>
      </div>
      <Field
        label="Numéro de téléphone"
        id="invite-telephone"
        required
        hint="Pour le suivi de la livraison par SMS."
        error={state.phone}
      >
        <PhoneInput
          countries={countries}
          name="phone"
          defaultCountry={saved?.phoneCountry}
          defaultValue={saved?.phoneNational}
          onChange={setPhone}
        />
      </Field>
      <Checkbox
        id="invite-cgu"
        name="terms"
        error={state.terms}
        label={
          <>
            J&apos;accepte les{" "}
            <Link href={routes.legal("cgu")} className="font-bold text-primary-600 underline">
              conditions d&apos;utilisation
            </Link>{" "}
            et la{" "}
            <Link href={routes.legal("confidentialite")} className="font-bold text-primary-600 underline">
              politique de confidentialité
            </Link>
            .
          </>
        }
      />
      <Button type="submit" block size="lg" iconRight="arrow-right" className="mt-2">
        Continuer vers la livraison
      </Button>
      <p className="text-center text-sm font-bold text-ink-600">
        Vous avez un compte ?{" "}
        <Link href={routes.login(routes.cart)} className="font-black text-primary-600 underline">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
