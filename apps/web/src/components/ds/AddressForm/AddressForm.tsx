"use client";

import { useState, type ReactNode } from "react";

import { cx } from "@/lib/cx";

import { Field } from "../Field";
import { Input } from "../Input";
import { ReferentialSelect, type ReferentialItem } from "../ReferentialSelect";

/** Liste servie par l'API (pays du référentiel, zones de livraison D38), avec son état de chargement. */
export type AddressOptions = {
  items: readonly ReferentialItem[] | undefined;
  status: "loading" | "error" | "ready";
  onRetry?: () => void;
};

export type AddressField = "country" | "zone" | "city" | "district" | "street";

export type AddressFormProps = {
  legend: ReactNode;
  /** Légende réservée aux lecteurs d'écran (titre déjà affiché par l'écran). */
  legendHidden?: boolean;
  /** Pays du référentiel `referentials/countries/`. */
  countries: AddressOptions;
  /** Zones de livraison du pays choisi, fournies par l'appelant (`shop/delivery-zones/`, D38). */
  zones: AddressOptions;
  /** Pays choisi (contrôlé) : l'appelant recharge les zones à chaque changement. */
  country: string;
  onCountryChange: (country: string) => void;
  /** Valeurs initiales (adresse enregistrée). */
  defaultValues?: Partial<Record<Exclude<AddressField, "country">, string>>;
  /** Erreurs par champ (validation locale ou `fields` de l'API). */
  errors?: Partial<Record<AddressField, ReactNode>>;
  /** Noms des champs dans le `FormData` (par défaut, ceux de `AddressField`). */
  names?: Partial<Record<AddressField, string>>;
  /** Champ de la zone envoyé comme valeur : `code` (défaut) ou `id`. */
  zoneValueKey?: "code" | "id";
  /** Préfixe des identifiants des champs, pour le résumé d'erreurs (`<préfixe>-pays`, `-zone`, `-ville`, `-quartier`, `-rue`). */
  idPrefix?: string;
  /** Champ « Ville » après la zone, quand l'adresse enregistrée l'exige (WD19, `accounts/me/delivery-address/`). */
  withCity?: boolean;
  /** Registre de l'aide (C2) : tutoiement de l'apprenant, vouvoiement du parent et de l'invité. */
  register?: "tu" | "vous";
  disabled?: boolean;
  className?: string;
};

/**
 * Adresse de livraison (WD19, WK05, WPD08, WPD15) : pays, zone, quartier, rue ou repère. Présentationnel : les
 * listes, l'enregistrement et les erreurs viennent de l'appelant ; aucune zone n'est codée en dur (D3, D38).
 */
export function AddressForm({
  legend,
  legendHidden = false,
  countries,
  zones,
  country,
  onCountryChange,
  defaultValues = {},
  errors = {},
  names = {},
  zoneValueKey = "code",
  idPrefix = "adresse",
  withCity = false,
  register = "tu",
  disabled,
  className,
}: AddressFormProps) {
  const tu = register === "tu";
  // Zone contrôlée : la valeur enregistrée reste choisie quand la liste arrive après le premier rendu, et un
  // changement de pays la vide.
  const [zone, setZone] = useState(defaultValues.zone ?? "");
  const changeCountry = (next: string) => {
    setZone("");
    onCountryChange(next);
  };
  return (
    <fieldset className={cx("m-0 flex min-w-0 flex-col gap-4 border-0 p-0", className)} disabled={disabled}>
      <legend className={legendHidden ? "sr-only" : "mb-2 p-0 text-base font-black text-ink-900"}>{legend}</legend>
      <Field label="Pays" id={`${idPrefix}-pays`} required error={errors.country}>
        <ReferentialSelect
          name={names.country ?? "country"}
          items={countries.items}
          status={countries.status}
          onRetry={countries.onRetry}
          value={country}
          onChange={changeCountry}
          placeholder={tu ? "Choisis ton pays" : "Choisissez votre pays"}
        />
      </Field>
      <Field label="Ville ou zone de livraison" id={`${idPrefix}-zone`} required error={errors.zone}>
        <ReferentialSelect
          name={names.zone ?? "zone"}
          items={zones.items}
          status={zones.status}
          onRetry={zones.onRetry}
          value={zone}
          onChange={setZone}
          valueKey={zoneValueKey}
          placeholder={tu ? "Choisis ta zone" : "Choisissez votre zone"}
        />
      </Field>
      {withCity && (
        <Field label="Ville" id={`${idPrefix}-ville`} required error={errors.city}>
          <Input name={names.city ?? "city"} defaultValue={defaultValues.city} autoComplete="address-level2" />
        </Field>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Quartier" id={`${idPrefix}-quartier`} required error={errors.district}>
          <Input name={names.district ?? "district"} defaultValue={defaultValues.district} autoComplete="address-level3" />
        </Field>
        <Field
          label="Rue / repère"
          id={`${idPrefix}-rue`}
          required
          error={errors.street}
          hint={
            tu
              ? "Un repère connu (pharmacie, école…) aide le livreur à te trouver."
              : "Un repère connu (pharmacie, école…) aide le livreur à vous trouver."
          }
        >
          <Input name={names.street ?? "street"} defaultValue={defaultValues.street} autoComplete="address-line1" />
        </Field>
      </div>
    </fieldset>
  );
}
