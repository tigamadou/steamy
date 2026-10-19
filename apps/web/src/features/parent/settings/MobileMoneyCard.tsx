"use client";

import type { Schemas } from "@steamy/api-client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button, ErrorSummary, Field, PhoneInput, ReferentialSelect, type PhoneCountry } from "@/components/ds";
import { initialCountry } from "@/components/ds/PhoneInput/phone";
import { SavedToast } from "@/features/account/SavedToast";
import { apiCall, errorMessage } from "@/lib/api-call";
import { useReferential } from "@/lib/use-referential";

import { EditableCard } from "./EditableCard";

type MobileMoney = Schemas["MobileMoney"];
type Errors = { network?: string; phone?: string; form?: string };

/** Numéro national d'un numéro E.164 du pays (pour préremplir `PhoneInput`), vide s'il n'en est pas. */
export function nationalOf(phone: string, country: PhoneCountry | undefined): string {
  const prefix = country ? `+${country.dialCode}` : "";
  return prefix && phone.startsWith(prefix) ? phone.slice(prefix.length) : "";
}

/**
 * Mobile Money préféré de WPD08 (D76) : pays et numéro (`PhoneInput`), réseau actif du pays
 * (`payment-networks/?country=`), enregistré dans `parent-profile` et prérempli dans WPD15 et WK06. Aucun réseau en
 * dur.
 */
export function MobileMoneyCard({ value, countries }: { value: MobileMoney | null; countries: PhoneCountry[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [country, setCountry] = useState(() => value?.country ?? initialCountry(countries));
  const [network, setNetwork] = useState(value?.network ?? "");
  const [phone, setPhone] = useState<string | null>(value?.phone ?? null);
  const [errors, setErrors] = useState<Errors>({});
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(0);
  const networks = useReferential("payment-networks", { country });
  const savedCountry = countries.find((c) => c.code === value?.country);
  const savedNetworks = useReferential("payment-networks", { country: value?.country });

  async function save(mobileMoney: Schemas["MobileMoneyRequest"] | null) {
    setPending(true);
    const result = await apiCall((api) => api.PATCH("/api/accounts/me/parent-profile/", { body: { mobileMoney } }));
    setPending(false);
    if (!result.ok) {
      setAttempt((n) => n + 1);
      const { network: networkError, phone: phoneError } = result.fields;
      setErrors(
        networkError || phoneError
          ? { network: networkError, phone: phoneError }
          : { form: errorMessage(result, "vous") },
      );
      return;
    }
    setEditing(false);
    setSaved((n) => n + 1);
    router.refresh();
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const local: Errors = {};
    if (!network) local.network = "Choisissez votre réseau Mobile Money.";
    if (!phone) local.phone = "Saisissez un numéro Mobile Money valide pour ce pays.";
    setErrors(local);
    setAttempt((n) => n + 1);
    if (local.network || local.phone) return;
    void save({ country, network, phone: phone as string });
  }

  const summary = [
    errors.phone && { field: "mobile-money-numero", message: errors.phone },
    errors.network && { field: "mobile-money-reseau", message: errors.network },
    errors.form && { message: errors.form },
  ].filter((item) => !!item);

  return (
    <>
      <EditableCard
        title="Mobile Money"
        editing={editing}
        onEdit={() => setEditing(true)}
        rows={[
          { label: "Pays", value: savedCountry?.label ?? value?.country },
          {
            label: "Réseau",
            value: savedNetworks.items?.find((n) => n.code === value?.network)?.label ?? value?.network,
          },
          { label: "Numéro", value: value?.phone },
        ]}
      >
        <form onSubmit={submit} noValidate aria-label="Mobile Money préféré" className="flex flex-col gap-4">
          <ErrorSummary errors={summary} focusKey={attempt} />
          <p className="m-0 text-[13px] font-semibold text-ink-600">
            Ce compte est proposé par défaut quand vous payez une demande de votre enfant ou une commande.
          </p>
          <Field label="Numéro Mobile Money" id="mobile-money-numero" required error={errors.phone}>
            <PhoneInput
              countries={countries}
              defaultCountry={value?.country}
              defaultValue={value ? nationalOf(value.phone, savedCountry) : ""}
              countryLabel="Pays du compte Mobile Money"
              onChange={(change) => {
                if (change.country !== country) setNetwork("");
                setCountry(change.country);
                setPhone(change.e164);
              }}
            />
          </Field>
          <Field label="Réseau" id="mobile-money-reseau" required error={errors.network}>
            <ReferentialSelect
              items={networks.items}
              status={networks.status === "idle" ? "loading" : networks.status}
              onRetry={networks.retry}
              value={network}
              onChange={setNetwork}
              placeholder="Choisissez votre réseau"
            />
          </Field>
          <div className="flex flex-wrap justify-end gap-3">
            {value && (
              <Button variant="ghost" onClick={() => void save(null)} disabled={pending}>
                Retirer ce compte
              </Button>
            )}
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Annuler
            </Button>
            <Button type="submit" loading={pending}>
              Enregistrer
            </Button>
          </div>
        </form>
      </EditableCard>
      {saved > 0 && <SavedToast key={saved} title="Votre Mobile Money préféré est enregistré." />}
    </>
  );
}
