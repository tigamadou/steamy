"use client";

import { useState, type ChangeEvent } from "react";

import { cx } from "@/lib/cx";

import { controlBoxClasses, useFieldControl } from "../Field";
import { controlTextClasses } from "../Field/control";
import { Icon } from "../Icon";
import {
  DEFAULT_COUNTRY,
  digitsOnly,
  flagEmoji,
  formatNational,
  initialCountry,
  isValidNational,
  toE164,
  type PhoneCountry,
} from "./phone";

export type PhoneChange = {
  /** Code ISO du pays choisi. */
  country: string;
  /** Chiffres du numéro national saisis. */
  national: string;
  /** Numéro au format E.164, `null` tant qu'il est invalide pour le pays. */
  e164: string | null;
  valid: boolean;
};

export type PhoneInputProps = {
  /** Pays proposés (`referentials/countries/`), passés par la page. */
  countries: PhoneCountry[];
  /** Pays initial (code ISO), le Bénin par défaut ; le premier de la liste s'il est absent. */
  defaultCountry?: string;
  /** Numéro national initial. */
  defaultValue?: string;
  onChange?: (change: PhoneChange) => void;
  /** Nom du champ caché qui porte le numéro E.164 dans un envoi de formulaire. */
  name?: string;
  id?: string;
  invalid?: boolean;
  required?: boolean;
  disabled?: boolean;
  /** Libellé accessible de la liste des pays. */
  countryLabel?: string;
  className?: string;
};

export function PhoneInput({
  countries,
  defaultCountry = DEFAULT_COUNTRY,
  defaultValue = "",
  onChange,
  name,
  id,
  invalid,
  required,
  disabled,
  countryLabel = "Pays",
  className,
}: PhoneInputProps) {
  const { invalid: isInvalid, ...a11y } = useFieldControl({ id, invalid, required });
  // Pays choisi par l'utilisateur, sinon celui par défaut : la liste peut arriver après le premier rendu
  const [picked, setCode] = useState<string>();
  const code = picked ?? initialCountry(countries, defaultCountry);
  const [national, setNational] = useState(() => digitsOnly(defaultValue));
  const country = countries.find((c) => c.code === code);

  const emit = (nextCode: string, nextNational: string) => {
    const next = countries.find((c) => c.code === nextCode);
    const e164 = next ? toE164(nextNational, next) : null;
    onChange?.({ country: nextCode, national: nextNational, e164, valid: e164 !== null });
  };

  const onCountry = (event: ChangeEvent<HTMLSelectElement>) => {
    setCode(event.target.value);
    emit(event.target.value, national);
  };

  const onNumber = (event: ChangeEvent<HTMLInputElement>) => {
    const digits = digitsOnly(event.target.value);
    setNational(digits);
    emit(code, digits);
  };

  const e164 = country && isValidNational(national, country) ? toE164(national, country) : null;
  const placeholder = country?.phoneFormat?.replace(/X/g, "0");

  return (
    <div className={controlBoxClasses(isInvalid, cx("relative h-14", className), "pr-4")}>
      {/* Liste native transparente posée sur le drapeau : compacte à 360 px, clavier du navigateur */}
      <span className="relative flex h-full items-center gap-1 border-r-2 border-ink-100 pr-2.5 pl-4">
        <span aria-hidden className="text-lg leading-none">
          {country ? country.flag || flagEmoji(country.code) : ""}
        </span>
        <Icon name="chevron-down" size={16} className="text-ink-600" />
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
      {country && (
        <span aria-hidden className="font-extrabold text-ink-700">
          +{digitsOnly(country.dialCode)}
        </span>
      )}
      <input
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        value={formatNational(national, country?.phoneFormat)}
        onChange={onNumber}
        placeholder={placeholder}
        disabled={disabled}
        {...a11y}
        className={controlTextClasses}
      />
      {name && <input type="hidden" name={name} value={e164 ?? ""} />}
    </div>
  );
}
