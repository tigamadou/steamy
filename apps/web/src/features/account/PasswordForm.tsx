"use client";

import { useActionState } from "react";

import { Button } from "@/components/ds/Button";
import { ErrorSummary } from "@/components/ds/ErrorSummary";
import { Field } from "@/components/ds/Field";
import { NewPasswordFields } from "@/components/ds/NewPasswordFields";
import { PasswordInput } from "@/components/ds/PasswordInput";
import { isPasswordValid } from "@/components/ds/PwReq";
import { apiCall, errorMessage, type Register } from "@/lib/api-call";
import { submitWith } from "@/lib/form";

import { SavedToast } from "./SavedToast";

type State = {
  attempt: number;
  current?: string;
  next?: string;
  error?: string;
  /** Nombre de changements réussis : remet le formulaire à zéro et affiche la confirmation. */
  saved: number;
};

const TEXTS = {
  tu: {
    current: "Indique ton mot de passe actuel.",
    next: "Choisis un nouveau mot de passe qui respecte les règles, saisi deux fois à l'identique.",
    confirm: "Confirme ton nouveau mot de passe",
    saved: "Ton mot de passe est mis à jour.",
  },
  vous: {
    current: "Indiquez votre mot de passe actuel.",
    next: "Choisissez un nouveau mot de passe qui respecte les règles, saisi deux fois à l'identique.",
    confirm: "Confirmez votre nouveau mot de passe",
    saved: "Votre mot de passe est mis à jour.",
  },
} as const;

/**
 * WD18 (apprenant) et WPD08 (parent, `register="vous"`) · Changer son mot de passe : mot de passe actuel, nouveau mot de passe avec les règles `PwReq` (D25) et sa
 * confirmation. La session reste ouverte. Pas de changement de numéro (D30).
 */
export function PasswordForm({ register = "tu" }: { register?: Register } = {}) {
  const texts = TEXTS[register];
  const [state, action, pending] = useActionState(
    async (previous: State, form: FormData): Promise<State> => {
      const attempt = previous.attempt + 1;
      const saved = previous.saved;
      const currentPassword = String(form.get("currentPassword") ?? "");
      const newPassword = String(form.get("newPassword") ?? "");
      const errors: State = { attempt, saved };
      if (!currentPassword) errors.current = texts.current;
      if (!isPasswordValid(newPassword) || newPassword !== form.get("newPasswordConfirm")) {
        errors.next = texts.next;
      }
      if (errors.current || errors.next) return errors;

      const result = await apiCall((api) =>
        api.POST("/api/accounts/me/password/", { body: { currentPassword, newPassword } }),
      );
      if (result.ok) return { attempt, saved: saved + 1 };
      const { currentPassword: current, newPassword: next } = result.fields;
      if (current || next) return { attempt, saved, current, next };
      return { attempt, saved, error: errorMessage(result, register) };
    },
    { attempt: 0, saved: 0 },
  );

  const errors = [
    state.current && { field: "mot-de-passe-actuel", message: state.current },
    state.next && { field: "nouveau-mot-de-passe", message: state.next },
    state.error && { message: state.error },
  ].filter((item) => !!item);

  return (
    <>
      {/* Après un changement réussi, le formulaire repart à vide (`key`). */}
      <form
        key={state.saved}
        onSubmit={submitWith(action)}
        noValidate
        className="flex flex-col gap-4 rounded-[18px] border-2 border-ink-100 bg-surface p-5"
      >
        <ErrorSummary
          title={register === "vous" ? "Corrigez les erreurs suivantes :" : undefined}
          errors={errors} focusKey={state.attempt} />
        <Field label="Mot de passe actuel" id="mot-de-passe-actuel" required error={state.current}>
          <PasswordInput name="currentPassword" autoComplete="current-password" />
        </Field>
        <div id="nouveau-mot-de-passe" tabIndex={-1} className="outline-none">
          <NewPasswordFields
            label="Nouveau mot de passe"
            confirmLabel={texts.confirm}
            name="newPassword"
            confirmName="newPasswordConfirm"
            error={state.next}
            showErrors={!!state.next}
          />
        </div>
        <Button type="submit" block loading={pending} className="mt-2">
          Mettre à jour le mot de passe
        </Button>
      </form>
      {state.saved > 0 && <SavedToast key={state.saved} title={texts.saved} />}
    </>
  );
}
