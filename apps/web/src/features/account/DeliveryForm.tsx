"use client";

import type { Schemas } from "@steamy/api-client";
import { useActionState, useState } from "react";

import { AddressForm, type AddressField } from "@/components/ds/AddressForm";
import { Button } from "@/components/ds/Button";
import { ErrorSummary } from "@/components/ds/ErrorSummary";
import { apiCall, errorMessage, type Register } from "@/lib/api-call";
import { submitWith } from "@/lib/form";
import { useDeliveryZones } from "@/lib/use-delivery-zones";
import { useReferential } from "@/lib/use-referential";

import { SavedToast } from "./SavedToast";

type Address = Schemas["DeliveryAddress"];

/** Champ de l'API → champ du formulaire (erreurs de `fields`). */
const API_FIELDS: Record<string, AddressField> = {
  zoneId: "zone",
  city: "city",
  district: "district",
  addressLine: "street",
};

/** Identifiant de chaque champ (`AddressForm`, préfixe `livraison`), pour les liens du récapitulatif d'erreurs. */
const FIELD_IDS: Record<AddressField, string> = {
  country: "pays",
  zone: "zone",
  city: "ville",
  district: "quartier",
  street: "rue",
};

const REQUIRED_MESSAGES: Record<Register, Record<AddressField, string>> = {
  tu: {
    country: "Choisis ton pays.",
    zone: "Choisis ta zone de livraison.",
    city: "Indique ta ville.",
    district: "Indique ton quartier.",
    street: "Indique ta rue ou un repère.",
  },
  vous: {
    country: "Choisissez votre pays.",
    zone: "Choisissez votre zone de livraison.",
    city: "Indiquez votre ville.",
    district: "Indiquez votre quartier.",
    street: "Indiquez votre rue ou un repère.",
  },
};

const SAVED: Record<Register, string> = {
  tu: "Ton adresse de livraison est enregistrée.",
  vous: "Votre adresse de livraison est enregistrée.",
};

type State = {
  attempt: number;
  fields: Partial<Record<AddressField, string>>;
  error?: string;
  /** Nombre d'enregistrements réussis : affiche la confirmation. */
  saved: number;
};

/**
 * WD19 (apprenant) et WPD08 (parent, `register="vous"`) · Adresse de livraison : pays, zone du référentiel
 * `shop/delivery-zones/?country=` (D38), ville, quartier, rue ou repère. `PUT accounts/me/delivery-address/` ; le
 * destinataire est le titulaire du compte (adresse proposée par défaut à la commande d'un kit). Ni téléphone ni moyen
 * de paiement (D30).
 */
export function DeliveryForm({
  address,
  defaultCountry,
  recipientName,
  register = "tu",
}: {
  address: Address | null;
  defaultCountry: string;
  recipientName: string;
  /** Registre : tutoiement de l'apprenant (WD19), vouvoiement du parent (WPD08). */
  register?: Register;
}) {
  const countries = useReferential("countries");
  const [country, setCountry] = useState(address?.zone.country ?? defaultCountry);
  const zones = useDeliveryZones(country);

  const [state, action, pending] = useActionState(
    async (previous: State, form: FormData): Promise<State> => {
      const attempt = previous.attempt + 1;
      const saved = previous.saved;
      const values = {
        country: String(form.get("country") ?? ""),
        zone: String(form.get("zone") ?? ""),
        city: String(form.get("city") ?? "").trim(),
        district: String(form.get("district") ?? "").trim(),
        street: String(form.get("street") ?? "").trim(),
      };
      const missing = (Object.keys(values) as AddressField[]).filter((field) => !values[field]);
      if (missing.length > 0) {
        return { attempt, saved, fields: Object.fromEntries(missing.map((field) => [field, REQUIRED_MESSAGES[register][field]])) };
      }
      const result = await apiCall((api) =>
        api.PUT("/api/accounts/me/delivery-address/", {
          body: {
            zoneId: Number(values.zone),
            recipientName: address?.recipientName || recipientName,
            city: values.city,
            district: values.district,
            addressLine: values.street,
          },
        }),
      );
      if (result.ok) return { attempt, saved: saved + 1, fields: {} };
      const fields = Object.fromEntries(
        Object.entries(result.fields)
          .filter(([name]) => name in API_FIELDS)
          .map(([name, message]) => [API_FIELDS[name], message]),
      );
      if (Object.keys(fields).length > 0) return { attempt, saved, fields };
      return { attempt, saved, fields: {}, error: errorMessage(result, register) };
    },
    { attempt: 0, saved: 0, fields: {} },
  );

  const errors = [
    ...(Object.entries(state.fields) as [AddressField, string][]).map(([field, message]) => ({
      field: `livraison-${FIELD_IDS[field]}`,
      message,
    })),
    ...(state.error ? [{ message: state.error }] : []),
  ];

  return (
    <>
      <form
        onSubmit={submitWith(action)}
        noValidate
        aria-label="Adresse de livraison"
        className="flex flex-col gap-4 rounded-[18px] border-2 border-ink-100 bg-surface p-5"
      >
        <ErrorSummary
          title={register === "vous" ? "Corrigez les erreurs suivantes :" : undefined}
          errors={errors} focusKey={state.attempt} />
        <AddressForm
          legend="Adresse de livraison"
          legendHidden
          idPrefix="livraison"
          withCity
          register={register}
          countries={{ items: countries.items, status: countries.status === "idle" ? "loading" : countries.status, onRetry: countries.retry }}
          zones={zones}
          country={country}
          onCountryChange={setCountry}
          zoneValueKey="id"
          defaultValues={
            address
              ? {
                  zone: String(address.zoneId),
                  city: address.city,
                  district: address.district,
                  street: address.addressLine,
                }
              : undefined
          }
          errors={state.fields}
        />
        <Button type="submit" block loading={pending} className="mt-2">
          Enregistrer l&apos;adresse
        </Button>
      </form>
      {state.saved > 0 && <SavedToast key={state.saved} title={SAVED[register]} />}
    </>
  );
}
