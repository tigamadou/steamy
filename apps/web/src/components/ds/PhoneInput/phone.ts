import type { Schemas } from "@steamy/api-client";

/**
 * Pays du sélecteur, tel que servi par `GET referentials/countries/` (D3) :
 * le composant ne connaît aucun pays en dur et n'appelle pas l'API.
 */
export type PhoneCountry = Pick<Schemas["Country"], "code" | "label" | "dialCode"> &
  Partial<Pick<Schemas["Country"], "flag" | "phoneFormat" | "phoneRegex">>;

/** Pays présélectionné quand la page n'en impose pas : le Bénin (ADR 0001, `DEFAULT_DIAL_CODE` de l'API). */
export const DEFAULT_COUNTRY = "BJ";

/** Pays présélectionné : `preferred` s'il est dans la liste, sinon le premier ; vide sans liste. */
export function initialCountry(countries: PhoneCountry[], preferred: string = DEFAULT_COUNTRY): string {
  return countries.find((c) => c.code === preferred)?.code ?? countries[0]?.code ?? "";
}

/** Drapeau emoji dérivé du code ISO (indicateurs régionaux Unicode). */
export function flagEmoji(code: string): string {
  return code
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .replace(/./g, (letter) => String.fromCodePoint(0x1f1e6 + letter.charCodeAt(0) - 65));
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** Met en forme les chiffres selon le gabarit du pays ; les chiffres en trop sont ajoutés à la fin. */
export function formatNational(digits: string, format?: string): string {
  if (!format) return digits;
  let index = 0;
  let out = "";
  for (const char of format) {
    if (index >= digits.length) break;
    if (char === "X") {
      out += digits[index++];
    } else {
      out += char;
    }
  }
  return out + digits.slice(index);
}

export function isValidNational(digits: string, country: PhoneCountry): boolean {
  if (!digits) return false;
  if (country.phoneRegex) return new RegExp(`^(?:${country.phoneRegex})$`).test(digits);
  if (country.phoneFormat) return digits.length === (country.phoneFormat.match(/X/g) ?? []).length;
  return digits.length >= 4;
}

/** Numéro E.164 (`+2290190123456`) ou `null` si le numéro national est invalide pour le pays. */
export function toE164(digits: string, country: PhoneCountry): string | null {
  return isValidNational(digits, country) ? `+${digitsOnly(country.dialCode)}${digits}` : null;
}

/**
 * Numéro affiché masqué (WL03, W07) : indicatif, deux premiers et deux derniers chiffres seulement,
 * `+229 01 •• •• •• 56`. Le pays est reconnu à son indicatif parmi `countries` pour reprendre son gabarit.
 */
export function maskPhone(e164: string, countries: PhoneCountry[] = []): string {
  const digits = digitsOnly(e164);
  const country = countries.find((c) => digits.startsWith(digitsOnly(c.dialCode)));
  const dial = country ? digitsOnly(country.dialCode) : "";
  const national = digits.slice(dial.length);
  const masked = [...national].map((digit, i) => (i < 2 || i >= national.length - 2 ? digit : "•")).join("");
  const body = formatNational(masked, country?.phoneFormat);
  return dial ? `+${dial} ${body}` : `+${body}`;
}
