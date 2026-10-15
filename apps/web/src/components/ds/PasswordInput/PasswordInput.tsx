"use client";

import { useState, type InputHTMLAttributes } from "react";

import { cx } from "@/lib/cx";

import { controlBoxClasses, useFieldControl } from "../Field";
import { controlTextClasses } from "../Field/control";
import { Icon } from "../Icon";

export type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "autoComplete"> & {
  /** Obligatoire : `new-password` (création) ou `current-password` (connexion), pour les gestionnaires de mots de passe. */
  autoComplete: "new-password" | "current-password";
  /** Erreur hors `Field` ; dans un `Field`, c'est sa prop `error` qui compte. */
  invalid?: boolean;
  /** Classes du cadre. */
  className?: string;
};

/** Champ mot de passe avec bouton afficher/masquer, compatible `Field`. */
export function PasswordInput({ invalid, className, id, required, disabled, ...rest }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const { invalid: isInvalid, ...a11y } = useFieldControl({ id, invalid, required, describedBy: rest["aria-describedby"] });
  return (
    <div className={controlBoxClasses(isInvalid, cx("h-14", className), "pl-4 pr-1.5")}>
      <input
        type={visible ? "text" : "password"}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        disabled={disabled}
        {...rest}
        {...a11y}
        className={controlTextClasses}
      />
      <button
        type="button"
        aria-pressed={visible}
        aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        onClick={() => setVisible((v) => !v)}
        disabled={disabled}
        className={cx(
          "flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-[10px] text-ink-600",
          "hover:bg-ink-50 hover:text-ink-900 disabled:cursor-not-allowed",
          "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-500",
        )}
      >
        <Icon name={visible ? "eye-off" : "eye"} size={20} />
      </button>
    </div>
  );
}
