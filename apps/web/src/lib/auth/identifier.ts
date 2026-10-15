/**
 * Champ « Identifiant ou numéro » de W16 (C7, ADR 0001), miroir de `find_persona` et de `libs/phone.py` côté API :
 * contient « @ » → email ; « + » ou uniquement des chiffres → téléphone ; sinon identifiant d'apprenant.
 * Sert à l'affichage et à la normalisation : le serveur tranche toujours.
 */
export type IdentifierKind = "email" | "phone" | "username";

/** Indicatif d'un numéro saisi sans « + » : le Bénin (`DEFAULT_DIAL_CODE` de l'API). */
export const DEFAULT_DIAL_CODE = "229";

const SEPARATORS = /[\s.\-()/]/g;
const E164 = /^\+[1-9]\d{7,14}$/;

/** Règles de l'identifiant d'un apprenant (`USERNAME_REGEX` et `HAS_LETTER_REGEX` de l'API). */
const USERNAME = /^[A-Za-z0-9._-]{3,30}$/;
const HAS_LETTER = /[A-Za-z]/;

function compact(value: string): string {
  return value.replace(SEPARATORS, "");
}

export function looksLikePhone(value: string): boolean {
  const c = compact(value);
  return c.length > 0 && (c.startsWith("+") || /^\d+$/.test(c));
}

export function identifierKind(value: string): IdentifierKind {
  const trimmed = value.trim();
  if (trimmed.includes("@")) return "email";
  if (looksLikePhone(trimmed)) return "phone";
  return "username";
}

/** Numéro en E.164, ou `null` s'il n'en est pas un ; sans indicatif, celui du pays donné (Bénin par défaut). */
export function normalizePhone(value: string, dialCode: string = DEFAULT_DIAL_CODE): string | null {
  let c = compact(value);
  if (c.startsWith("00")) {
    c = `+${c.slice(2)}`;
  } else if (/^\d+$/.test(c)) {
    c = `+${dialCode.replace(/\D/g, "")}${c}`;
  }
  return E164.test(c) ? c : null;
}

/**
 * Valeur envoyée à `auth/login/` : le téléphone normalisé selon le pays choisi quand c'est possible,
 * sinon la saisie telle quelle (le serveur répondra `INVALID_CREDENTIALS`).
 */
export function loginIdentifier(value: string, dialCode: string = DEFAULT_DIAL_CODE): string {
  const trimmed = value.trim();
  if (identifierKind(trimmed) !== "phone") return trimmed;
  return normalizePhone(trimmed, dialCode) ?? trimmed;
}

/** Un identifiant d'apprenant ne peut être ni un email ni un numéro (C7). */
export function isValidUsername(value: string): boolean {
  return USERNAME.test(value) && HAS_LETTER.test(value);
}
