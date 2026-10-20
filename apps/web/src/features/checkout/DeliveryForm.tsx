"use client";

import type { Schemas } from "@steamy/api-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { AddressForm, Button, ErrorSummary, Field, PhoneInput } from "@/components/ds";
import { errorMessage } from "@/lib/api-call";
import { formatPrice } from "@/lib/format";
import { routes } from "@/lib/routes";
import { useReferential } from "@/lib/use-referential";

import { createKitOrder, getZones } from "./api";
import { orderItems, type ReadyCart } from "./CheckoutGate";
import { readCheckout, saveOrderToken, updateCheckout, type DeliveryInfo } from "./checkout-storage";

type Errors = { country?: string; zone?: string; district?: string; street?: string; phone?: string; form?: string };

/** Zones de livraison du pays choisi (D38), avec leurs frais et leur délai. */
function useZones(country: string) {
  const [attempt, setAttempt] = useState(0);
  const key = `${country}#${attempt}`;
  const [loaded, setLoaded] = useState<{ key: string; zones?: Schemas["DeliveryZone"][] }>({ key: "" });
  useEffect(() => {
    if (!country) return;
    let current = true;
    getZones(country).then((result) => current && setLoaded({ key, zones: result.ok ? result.data : undefined }));
    return () => {
      current = false;
    };
  }, [country, key]);
  const ready = loaded.key === key;
  return {
    zones: ready ? loaded.zones : undefined,
    status: !ready ? ("loading" as const) : loaded.zones ? ("ready" as const) : ("error" as const),
    retry: () => setAttempt((n) => n + 1),
  };
}

/**
 * WK05 · Livraison de l'invité : `AddressForm` du DS, zones du pays (`shop/delivery-zones/?country=`), frais et délai
 * lus dans la zone dès qu'elle est choisie (jamais calculés), téléphone du destinataire prérempli. « Continuer vers
 * le paiement » crée la commande (`POST payments/orders/`), qui calcule le total et réserve le stock (D37, D38).
 */
export function DeliveryForm({ cart }: { cart: ReadyCart }) {
  const router = useRouter();
  const [{ guest, delivery: saved }] = useState(readCheckout);
  const countries = useReferential("countries");
  const [country, setCountry] = useState(saved?.country ?? "");
  const [zoneId, setZoneId] = useState(saved ? String(saved.zoneId) : "");
  const zones = useZones(country);
  const zone = zones.zones?.find((z) => String(z.id) === zoneId);
  const [errors, setErrors] = useState<Errors>({});
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState(false);
  const [outOfStock, setOutOfStock] = useState(false);

  // Coordonnées absentes (onglet neuf, accès direct) : retour à WK04
  useEffect(() => {
    if (!guest) router.replace(routes.checkout.guest);
  }, [guest, router]);
  if (!guest) return null;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const district = String(form.get("district")).trim();
    const street = String(form.get("street")).trim();
    const phone = String(form.get("recipientPhone"));
    const found: Errors = {};
    if (!country) found.country = "Choisissez votre pays.";
    if (!zone) found.zone = "Choisissez votre zone de livraison.";
    if (!district) found.district = "Indiquez votre quartier.";
    if (!street) found.street = "Indiquez une rue ou un repère.";
    if (!phone) found.phone = "Indiquez un numéro de téléphone valide.";
    setAttempt((n) => n + 1);
    setOutOfStock(false);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const delivery: DeliveryInfo = { country, zoneId: zone!.id, district, addressLine: street };
    updateCheckout({ delivery });
    setPending(true);
    const result = await createKitOrder({
      items: orderItems(cart),
      guest: { firstName: guest.firstName, lastName: guest.lastName, phone: guest.phone },
      deliveryAddress: {
        zoneId: zone!.id,
        recipientName: `${guest.firstName} ${guest.lastName}`,
        phone,
        city: zone!.name.slice(0, 80),
        district,
        addressLine: street,
      },
    });
    setPending(false);
    if (result.ok) {
      if (result.data.guestToken) saveOrderToken(result.data.reference, result.data.guestToken);
      updateCheckout({ reference: result.data.reference });
      router.push(routes.checkout.payment);
      return;
    }
    if (result.code === "OUT_OF_STOCK") {
      setOutOfStock(true);
    } else if (result.fields.deliveryAddress) {
      setErrors({ zone: result.fields.deliveryAddress });
    } else {
      setErrors({ form: errorMessage(result, "vous") });
    }
  };

  const summary = [
    errors.country && { field: "livraison-pays", message: errors.country },
    errors.zone && { field: "livraison-zone", message: errors.zone },
    errors.district && { field: "livraison-quartier", message: errors.district },
    errors.street && { field: "livraison-rue", message: errors.street },
    errors.phone && { field: "livraison-telephone", message: errors.phone },
    errors.form && { message: errors.form },
  ].filter((item) => !!item);

  return (
    <form
      onSubmit={submit}
      // Zone choisie dans `AddressForm` : frais et délai affichés aussitôt
      onChange={(event) => {
        const target = event.target as unknown as HTMLSelectElement;
        if (target.name === "zone") setZoneId(target.value);
      }}
      noValidate
      className="flex flex-col gap-4"
    >
      <ErrorSummary title="Corrigez les erreurs suivantes :" errors={summary} focusKey={attempt} />
      {outOfStock && (
        <p role="alert" className="rounded-[14px] bg-error-50 p-3.5 text-sm font-bold text-error-700">
          Un kit de votre panier vient d&apos;être épuisé.{" "}
          <Link href={routes.cart} className="underline">
            Revenir au panier
          </Link>
        </p>
      )}
      <AddressForm
        legend="Adresse de livraison"
        legendHidden
        register="vous"
        idPrefix="livraison"
        countries={{
          items: countries.items,
          status: countries.status === "idle" ? "loading" : countries.status,
          onRetry: countries.retry,
        }}
        zones={{
          items: zones.zones?.map((z) => ({ id: z.id, code: String(z.id), label: z.name })),
          status: country ? zones.status : "ready",
          onRetry: zones.retry,
        }}
        country={country}
        onCountryChange={(next) => {
          setCountry(next);
          setZoneId("");
        }}
        zoneValueKey="id"
        defaultValues={saved && { zone: String(saved.zoneId), district: saved.district, street: saved.addressLine }}
        errors={{ country: errors.country, zone: errors.zone, district: errors.district, street: errors.street }}
      />
      <div aria-live="polite">
        {zone && (
          <p className="rounded-[14px] bg-primary-50 p-3.5 text-sm font-bold text-primary-800">
            Livraison {zone.name} : {formatPrice(zone.fee)} · délai annoncé {zone.delayLabel}
          </p>
        )}
      </div>
      <Field
        label="Téléphone du destinataire"
        id="livraison-telephone"
        required
        hint="Le livreur vous appelle à ce numéro."
        error={errors.phone}
      >
        <PhoneInput
          countries={countries.items ?? []}
          name="recipientPhone"
          defaultCountry={guest.phoneCountry}
          defaultValue={guest.phoneNational}
          countryLabel="Indicatif du téléphone du destinataire"
        />
      </Field>
      <p className="text-sm font-semibold text-ink-600">
        {cart.count} article{cart.count > 1 ? "s" : ""} : le total, livraison comprise, est calculé à l&apos;étape
        suivante.
      </p>
      <Button type="submit" block size="lg" loading={pending} iconRight="arrow-right">
        Continuer vers le paiement
      </Button>
    </form>
  );
}
