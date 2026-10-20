"use client";

import { useState, type FormEvent } from "react";

import { errorMessage, type ApiResult, type Register } from "@/lib/api-call";
import { formatPrice } from "@/lib/format";
import { useReferential } from "@/lib/use-referential";
import { throttledLabel, useThrottle } from "@/lib/use-throttle";

import { Button } from "../Button";
import { Field } from "../Field";
import { Icon } from "../Icon";
import { Loader } from "../Loader";
import { PhoneInput, type PhoneChange, type PhoneCountry } from "../PhoneInput";
import { initialCountry } from "../PhoneInput/phone";
import { Select } from "../Select";
import { WANetworkCardGroup } from "../WANetworkCard";

/** Corps de `POST payments/orders/{reference}/payments/` (Mobile Money uniquement, D76). */
export type PaymentFormValues = { country: string; network: string; msisdn: string };

export type PaymentFormProps = {
  /** Montant à payer, calculé par le serveur (total de la commande, D37) : affiché, jamais recalculé. */
  amount: number;
  /** Pays du référentiel (`referentials/countries/`), passés par la page. */
  countries: PhoneCountry[];
  /** Pays présélectionné (code ISO). */
  defaultCountry?: string;
  /** Registre des textes : `vous` pour le parent et l'invité (WA03, WK06), `tu` sinon. */
  register?: Register;
  /** Envoi du paiement ; un échec est affiché par le formulaire (erreurs par champ ou message). */
  onSubmit: (values: PaymentFormValues) => Promise<ApiResult<unknown>>;
};

const TEXTS = {
  tu: {
    network: "Choisis ton réseau Mobile Money.",
    phone: "Saisis un numéro Mobile Money valide pour ce pays.",
    noNetwork: "Aucun réseau Mobile Money n'est disponible pour ce pays. Choisis un autre pays.",
  },
  vous: {
    network: "Choisissez votre réseau Mobile Money.",
    phone: "Saisissez un numéro Mobile Money valide pour ce pays.",
    noNetwork: "Aucun réseau Mobile Money n'est disponible pour ce pays. Choisissez un autre pays.",
  },
} as const;

type Errors = Partial<Record<keyof PaymentFormValues | "form", string>>;

/**
 * WA03 · Formulaire Mobile Money (composant, D76) : pays du référentiel, réseaux actifs du pays
 * (`payment-networks/?country=`) en cartes radio, numéro E.164 au format du pays, « Payer n F CFA » avec le montant du
 * serveur. Aucun pays, réseau ni prix codé en dur. Réutilisé par le checkout invité (WK06) et le parent (WPD15).
 */
export function PaymentForm({ amount, countries, defaultCountry, register = "vous", onSubmit }: PaymentFormProps) {
  const texts = TEXTS[register];
  const [country, setCountry] = useState(() => initialCountry(countries, defaultCountry));
  // Réseau et numéro valent pour un pays : ils repartent à zéro quand le pays change
  const [choice, setChoice] = useState<{ country: string; network: string }>({ country: "", network: "" });
  const [phone, setPhone] = useState<PhoneChange | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);
  const { wait, track } = useThrottle();
  const networks = useReferential("payment-networks", { country });
  const network = choice.country === country ? choice.network : "";
  const msisdn = phone?.country === country ? phone.e164 : null;
  const noNetwork = networks.status === "ready" && networks.items?.length === 0;

  const changeCountry = (code: string) => {
    setCountry(code);
    setPhone(null);
    setErrors({});
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const local: Errors = {};
    if (!network) local.network = texts.network;
    if (!msisdn) local.msisdn = texts.phone;
    setErrors(local);
    if (local.network || local.msisdn) return;
    setPending(true);
    const result = await onSubmit({ country, network, msisdn: msisdn as string });
    setPending(false);
    if (result.ok) return;
    track(result);
    const { fields } = result;
    const byField: Errors = { country: fields.country, network: fields.network, msisdn: fields.msisdn };
    const hasField = Object.values(byField).some(Boolean);
    setErrors(hasField ? byField : { form: errorMessage(result, register) });
  };

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Pays" required error={errors.country}>
        <Select value={country} onChange={(event) => changeCountry(event.target.value)} autoComplete="country">
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </Select>
      </Field>

      {networks.status === "ready" && !noNetwork && (
        <WANetworkCardGroup
          networks={networks.items ?? []}
          value={network}
          onChange={(code) => setChoice({ country, network: code })}
          error={errors.network}
        />
      )}
      <div aria-live="polite">
        {networks.status === "loading" && <Loader label="Chargement des réseaux Mobile Money…" />}
        {networks.status === "error" && (
          <div className="flex flex-wrap items-center gap-3">
            <p className="flex items-center gap-1 text-[13px] font-bold text-error-600">
              <Icon name="alert" size={14} strokeWidth={2.5} />
              Impossible de charger les réseaux Mobile Money.
            </p>
            <Button variant="outline" size="sm" className="min-h-11" onClick={networks.retry}>
              Réessayer
            </Button>
          </div>
        )}
        {noNetwork && <p className="text-sm font-bold text-ink-700">{texts.noNetwork}</p>}
      </div>

      <Field label="Numéro Mobile Money" required error={errors.msisdn}>
        <PhoneInput
          key={country}
          countries={countries.filter((c) => c.code === country)}
          defaultCountry={country}
          onChange={setPhone}
          countryLabel="Indicatif du numéro Mobile Money"
        />
      </Field>

      {errors.form && (
        <p role="alert" className="text-sm font-bold text-error-700">
          {errors.form}
        </p>
      )}

      <Button type="submit" block size="lg" variant="secondary" loading={pending} disabled={noNetwork || wait > 0}>
        {throttledLabel(wait, `Payer ${formatPrice(amount)}`)}
      </Button>
      <p className="flex items-center justify-center gap-2 text-xs font-bold text-ink-600">
        <Icon name="lock" size={14} />
        Paiement sécurisé · aucune carte bancaire
      </p>
    </form>
  );
}
