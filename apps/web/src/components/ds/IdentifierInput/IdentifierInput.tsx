"use client";

import { useState, type ChangeEvent } from "react";

import { identifierKind, loginIdentifier, type IdentifierKind } from "@/lib/auth/identifier";
import { cx } from "@/lib/cx";

import { controlBoxClasses, useFieldControl } from "../Field";
import { controlTextClasses } from "../Field/control";
import { Icon, type IconName } from "../Icon";
import { DEFAULT_COUNTRY, digitsOnly, flagEmoji, initialCountry, type PhoneCountry } from "../PhoneInput/phone";

export type IdentifierChange = {
  /** Saisie brute. */
  raw: string;
  kind: IdentifierKind;
  /** Valeur à envoyer à `auth/login/` : numéro normalisé en E.164 selon le pays choisi, sinon la saisie rognée. */
  value: string;
};

export type IdentifierInputProps = {
  /** Pays proposés pour un numéro saisi sans indicatif (`referentials/countries/`). */
  countries: PhoneCountry[];
  defaultValue?: string;
  defaultCountry?: string;
  onChange?: (change: IdentifierChange) => void;
  /** Nom du champ caché qui porte la valeur normalisée dans un envoi de formulaire. */
  name?: string;
  id?: string;
  invalid?: boolean;
  required?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  countryLabel?: string;
  className?: string;
};

const ICONS: Record<IdentifierKind, IconName> = { email: "mail", phone: "phone", username: "user" };

/**
 * Champ « Identifiant ou numéro » de W16 (C7) : l'affichage suit la résolution côté client (« @ » → email,
 * chiffres → téléphone avec un sélecteur de pays discret, sinon identifiant) ; le serveur tranche.
 */
export function IdentifierInput({
  countries,
  defaultValue = "",
  defaultCountry = DEFAULT_COUNTRY,
  onChange,
  name,
  id,
  invalid,
  required,
  disabled,
  autoFocus,
  countryLabel = "Pays du numéro",
  className,
}: IdentifierInputProps) {
  const { invalid: isInvalid, ...a11y } = useFieldControl({ id, invalid, required });
  const [raw, setRaw] = useState(defaultValue);
  // Pays choisi par l'utilisateur, sinon celui par défaut : la liste peut arriver après le premier rendu
  const [picked, setCode] = useState<string>();
  const code = picked ?? initialCountry(countries, defaultCountry);
  const kind = identifierKind(raw);
  const country = countries.find((c) => c.code === code);
  // Le pays ne sert qu'à un numéro national : avec « + » ou « 00 », l'indicatif est déjà saisi.
  const national = kind === "phone" && !/^\s*(\+|00)/.test(raw);
  const valueOf = (input: string, dial = country?.dialCode) => loginIdentifier(input, dial);

  const emit = (nextRaw: string, dial?: string) =>
    onChange?.({ raw: nextRaw, kind: identifierKind(nextRaw), value: valueOf(nextRaw, dial) });

  const onInput = (event: ChangeEvent<HTMLInputElement>) => {
    setRaw(event.target.value);
    emit(event.target.value);
  };

  const onCountry = (event: ChangeEvent<HTMLSelectElement>) => {
    setCode(event.target.value);
    emit(raw, countries.find((c) => c.code === event.target.value)?.dialCode);
  };

  return (
    <div className={controlBoxClasses(isInvalid, cx("relative h-14", className), national && country ? "pr-4" : "px-4")}>
      {national && country ? (
        <span className="relative flex h-full items-center gap-1 border-r-2 border-ink-100 pr-2.5 pl-4">
          <span aria-hidden className="text-lg leading-none">
            {country.flag || flagEmoji(country.code)}
          </span>
          <span aria-hidden className="text-sm font-extrabold text-ink-700">
            +{digitsOnly(country.dialCode)}
          </span>
          <select
            aria-label={countryLabel}
            value={code}
            onChange={onCountry}
            disabled={disabled}
            className="absolute inset-0 cursor-pointer opacity-0"
          >
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {`${c.label} (+${digitsOnly(c.dialCode)})`}
              </option>
            ))}
          </select>
        </span>
      ) : (
        <Icon name={ICONS[kind]} size={20} className="text-ink-600" />
      )}
      <input
        type="text"
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        value={raw}
        onChange={onInput}
        disabled={disabled}
        autoFocus={autoFocus}
        {...a11y}
        className={controlTextClasses}
      />
      {name && <input type="hidden" name={name} value={valueOf(raw)} />}
    </div>
  );
}
