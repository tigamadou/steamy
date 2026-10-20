"use client";

import type { ChangeEvent, InputHTMLAttributes } from "react";

import { Input } from "../Input";

/** Préfixe imprimé sur la notice des kits (D35) : sert à la mise en forme, jamais à valider le code. */
export const KIT_CODE_PREFIX = "STEAMY";

/**
 * Mise en forme de la saisie d'un Kit Code (D35) : majuscules, caractères autres que lettres et chiffres retirés,
 * préfixe et tirets insérés (`steamyab12cd34` ou `ab12cd34` → `STEAMY-AB12-CD34`). Aucune validation : la longueur,
 * l'alphabet et la confusion O/0 ou I/1 sont jugés par le serveur, qui renvoie `KIT_CODE_INVALID`.
 */
export function formatKitCode(raw: string): string {
  const chars = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!chars) return "";
  // Préfixe en cours de frappe (ou effacé caractère par caractère) : laissé tel quel, sans tiret
  if (KIT_CODE_PREFIX.startsWith(chars)) return chars;
  const body = chars.startsWith(KIT_CODE_PREFIX) ? chars.slice(KIT_CODE_PREFIX.length) : chars;
  return [KIT_CODE_PREFIX, body.slice(0, 4), body.slice(4)].filter(Boolean).join("-");
}

export type KitCodeInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "prefix"> & {
  value: string;
  /** Code mis en forme (`STEAMY-XXXX-XXXX`), à envoyer tel quel à l'API. */
  onValueChange: (code: string) => void;
  invalid?: boolean;
  className?: string;
};

// Champ « Code Kit » de WA01 : saisie et collage mis en forme à la volée, clavier en majuscules, pas d'autocomplétion.
export function KitCodeInput({ value, onValueChange, invalid, className, ...rest }: KitCodeInputProps) {
  return (
    <Input
      {...rest}
      icon="gift"
      invalid={invalid}
      className={className}
      value={value}
      onChange={(event: ChangeEvent<HTMLInputElement>) => onValueChange(formatKitCode(event.target.value))}
      placeholder={`${KIT_CODE_PREFIX}-XXXX-XXXX`}
      autoComplete="off"
      autoCapitalize="characters"
      autoCorrect="off"
      spellCheck={false}
      inputMode="text"
    />
  );
}
