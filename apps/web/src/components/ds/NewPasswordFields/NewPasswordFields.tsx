"use client";

import { useId, useState, type ReactNode } from "react";

import { cx } from "@/lib/cx";

import { Field } from "../Field";
import { PasswordInput } from "../PasswordInput";
import { PwReq, isPasswordValid } from "../PwReq";

export type NewPasswordChange = {
  password: string;
  confirm: string;
  /** Règles D25 respectées et confirmation identique. */
  valid: boolean;
};

export type NewPasswordFieldsProps = {
  /** Libellé du premier champ (tutoiement par défaut). */
  label?: ReactNode;
  /** Libellé de la confirmation (« Confirmez votre mot de passe » au vouvoiement). */
  confirmLabel?: ReactNode;
  /** Message de non-concordance. */
  mismatchMessage?: ReactNode;
  name?: string;
  confirmName?: string;
  onChange?: (change: NewPasswordChange) => void;
  /** Erreur serveur (ex. `PASSWORD_TOO_WEAK`) : affichée sous le premier champ, règles en rouge. */
  error?: ReactNode;
  /** Après une tentative de soumission : règles non respectées et non-concordance signalées même sans saisie. */
  showErrors?: boolean;
  disabled?: boolean;
  className?: string;
};

/** Création d'un mot de passe : saisie, règles D25 et confirmation (W10, WP03, WL04, activation). */
export function NewPasswordFields({
  label = "Mot de passe",
  confirmLabel = "Confirme ton mot de passe",
  mismatchMessage = "Les mots de passe ne correspondent pas",
  name = "password",
  confirmName = "passwordConfirm",
  onChange,
  error,
  showErrors = false,
  disabled,
  className,
}: NewPasswordFieldsProps) {
  const rulesId = `regles-${useId()}`;
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const update = (nextPassword: string, nextConfirm: string) => {
    setPassword(nextPassword);
    setConfirm(nextConfirm);
    onChange?.({
      password: nextPassword,
      confirm: nextConfirm,
      valid: isPasswordValid(nextPassword) && nextPassword === nextConfirm,
    });
  };

  const rulesError = showErrors && !isPasswordValid(password);
  const mismatch = confirm !== password && (confirm !== "" || showErrors);

  return (
    <div className={cx("flex flex-col gap-4", className)}>
      <div className="flex flex-col gap-2.5">
        <Field label={label} error={error} required>
          <PasswordInput
            name={name}
            autoComplete="new-password"
            value={password}
            onChange={(event) => update(event.target.value, confirm)}
            invalid={rulesError || undefined}
            aria-describedby={rulesId}
            disabled={disabled}
          />
        </Field>
        <PwReq id={rulesId} password={password} error={!!error || rulesError} />
      </div>
      <Field label={confirmLabel} error={mismatch ? mismatchMessage : undefined} required>
        <PasswordInput
          name={confirmName}
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => update(password, event.target.value)}
          disabled={disabled}
        />
      </Field>
    </div>
  );
}
