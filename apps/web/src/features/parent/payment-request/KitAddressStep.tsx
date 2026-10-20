"use client";

import type { Schemas } from "@steamy/api-client";
import { useState, type FormEvent } from "react";

import { AddressForm, Button, Checkbox, ErrorSummary, type AddressField } from "@/components/ds";
import { apiCall, errorMessage, type ApiResult } from "@/lib/api-call";
import { useDeliveryZones } from "@/lib/use-delivery-zones";
import { useReferential } from "@/lib/use-referential";

type Address = Schemas["DeliveryAddress"];
type Order = Schemas["OrderCreated"];

const REQUIRED: Record<Exclude<AddressField, "country">, string> = {
  zone: "Choisissez la zone de livraison.",
  city: "Indiquez la ville.",
  district: "Indiquez le quartier.",
  street: "Indiquez la rue ou un repère.",
};

/** Champ de l'API → champ du formulaire (erreurs de `fields`). */
const API_FIELDS: Record<string, AddressField> = {
  zoneId: "zone",
  "deliveryAddress.zoneId": "zone",
  city: "city",
  "deliveryAddress.city": "city",
  district: "district",
  "deliveryAddress.district": "district",
  addressLine: "street",
  "deliveryAddress.addressLine": "street",
};

const IDS: Record<AddressField, string> = {
  country: "livraison-pays",
  zone: "livraison-zone",
  city: "livraison-ville",
  district: "livraison-quartier",
  street: "livraison-rue",
};

export type KitAddressStepProps = {
  requestId: number;
  /** Adresse par défaut (WPD08), préremplie et modifiable. */
  address: Address | null;
  /** Pays de la localité du parent, faute d'adresse enregistrée. */
  defaultCountry: string;
  recipientName: string;
  /** Commande créée : frais de la zone et total calculés par le serveur. */
  onOrder: (order: Order) => void;
  /** Kit en rupture : paiement impossible. */
  onOutOfStock: () => void;
};

/**
 * Adresse de livraison d'une demande de kit (WPD15, C10, D38) : préremplie depuis WPD08, zone du référentiel, option
 * « Enregistrer comme adresse par défaut ». « Continuer vers le paiement » crée la commande, qui réserve le stock
 * 30 minutes et calcule frais et total (serveur).
 */
export function KitAddressStep({ requestId, address, defaultCountry, recipientName, onOrder, onOutOfStock }: KitAddressStepProps) {
  const countries = useReferential("countries");
  const [country, setCountry] = useState(address?.zone.country ?? defaultCountry);
  const zones = useDeliveryZones(country);
  const [fields, setFields] = useState<Partial<Record<AddressField, string>>>({});
  const [error, setError] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "").trim();
    const values = { zone: value("zone"), city: value("city"), district: value("district"), street: value("street") };
    const missing = (Object.keys(values) as Array<keyof typeof values>).filter((field) => !values[field]);
    setAttempt((n) => n + 1);
    setError(undefined);
    if (missing.length > 0) {
      setFields(Object.fromEntries(missing.map((field) => [field, REQUIRED[field]])));
      return;
    }
    setFields({});
    const deliveryAddress = {
      zoneId: Number(values.zone),
      recipientName,
      city: values.city,
      district: values.district,
      addressLine: values.street,
    };
    setPending(true);
    if (form.get("saveDefault") === "on") {
      // L'enregistrement de l'adresse par défaut est un confort : son échec n'empêche pas la commande
      await apiCall((api) => api.PUT("/api/accounts/me/delivery-address/", { body: deliveryAddress }));
    }
    const result: ApiResult<Order> = await apiCall((api) =>
      api.POST("/api/payments/orders/", { body: { paymentRequestId: requestId, deliveryAddress } }),
    );
    setPending(false);
    if (result.ok) return onOrder(result.data);
    if (result.code === "OUT_OF_STOCK") return onOutOfStock();
    const byField = Object.fromEntries(
      Object.entries(result.fields)
        .filter(([name]) => name in API_FIELDS)
        .map(([name, message]) => [API_FIELDS[name], message]),
    );
    if (result.code === "DELIVERY_ZONE_UNAVAILABLE") {
      setFields({ zone: "Cette zone n'est plus desservie. Choisissez-en une autre." });
    } else if (Object.keys(byField).length > 0) {
      setFields(byField);
    } else {
      setError(errorMessage(result, "vous"));
    }
  }

  const summary = [
    ...(Object.entries(fields) as [AddressField, string][]).map(([field, message]) => ({ field: IDS[field], message })),
    ...(error ? [{ message: error }] : []),
  ];

  return (
    <form
      onSubmit={(event) => void submit(event)}
      noValidate
      aria-label="Adresse de livraison"
      className="flex flex-col gap-4 rounded-[14px] border-2 border-primary-200 bg-primary-50 p-3.5"
    >
      <ErrorSummary errors={summary} focusKey={attempt} />
      <AddressForm
        legend="🚚 Adresse de livraison"
        idPrefix="livraison"
        withCity
        register="vous"
        countries={{
          items: countries.items,
          status: countries.status === "idle" ? "loading" : countries.status,
          onRetry: countries.retry,
        }}
        zones={zones}
        country={country}
        onCountryChange={setCountry}
        zoneValueKey="id"
        defaultValues={
          address
            ? { zone: String(address.zoneId), city: address.city, district: address.district, street: address.addressLine }
            : undefined
        }
        errors={fields}
      />
      <Checkbox name="saveDefault" label="Enregistrer comme adresse par défaut" />
      <Button type="submit" block loading={pending}>
        Continuer vers le paiement
      </Button>
    </form>
  );
}
