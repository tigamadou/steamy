/**
 * Pays du sélecteur, tel que servi par `GET referentials/countries/` (D3) :
 * le composant ne connaît aucun pays en dur et n'appelle pas l'API.
 */
export type PhoneCountry = {
  /** Code ISO 3166-1 alpha-2 (`BJ`). */
  code: string;
  name: string;
  /** Indicatif, avec ou sans `+` (`229`). */
  dialCode: string;
  /** Gabarit d'affichage du numéro national, `X` pour un chiffre (`XX XX XX XX XX`). */
  format?: string;
  /** Expression régulière de validation du numéro national (chiffres seuls). */
  pattern?: string;
};

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
  if (country.pattern) return new RegExp(`^(?:${country.pattern})$`).test(digits);
  if (country.format) return digits.length === (country.format.match(/X/g) ?? []).length;
  return digits.length >= 4;
}

/** Numéro E.164 (`+2290190123456`) ou `null` si le numéro national est invalide pour le pays. */
export function toE164(digits: string, country: PhoneCountry): string | null {
  return isValidNational(digits, country) ? `+${digitsOnly(country.dialCode)}${digits}` : null;
}
