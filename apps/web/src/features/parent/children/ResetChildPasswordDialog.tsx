"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ds/Button";
import { ErrorSummary } from "@/components/ds/ErrorSummary";
import { Modal } from "@/components/ds/Modal";
import { NewPasswordFields } from "@/components/ds/NewPasswordFields";
import { isPasswordValid } from "@/components/ds/PwReq";
import { SavedToast } from "@/features/account/SavedToast";
import { apiCall, errorMessage } from "@/lib/api-call";
import { submitWith } from "@/lib/form";

type State = {
  attempt: number;
  password?: string;
  error?: string;
  /** Nombre de réinitialisations réussies : ferme la modale et affiche la confirmation. */
  saved: number;
};

const FIELD_ID = "nouveau-mot-de-passe-enfant";

/**
 * WPD03 · « Réinitialiser le mot de passe » (D26, §8.9) : le parent choisit le nouveau mot de passe (règles `PwReq`,
 * D25, et confirmation) et le communique à son enfant ; l'ancien ne permet plus de se connecter.
 */
export function ResetChildPasswordDialog({
  childId,
  firstName,
  username,
}: {
  childId: number;
  firstName: string;
  username: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    async (previous: State, form: FormData): Promise<State> => {
      const attempt = previous.attempt + 1;
      const { saved } = previous;
      const password = String(form.get("password") ?? "");
      if (!isPasswordValid(password) || password !== form.get("passwordConfirm")) {
        return {
          attempt,
          saved,
          password: "Choisissez un mot de passe qui respecte les règles, saisi deux fois à l'identique.",
        };
      }
      const result = await apiCall((api) =>
        api.POST("/api/accounts/children/{id}/password-reset/", {
          params: { path: { id: String(childId) } },
          body: { password },
        }),
      );
      if (result.ok) {
        setOpen(false);
        return { attempt, saved: saved + 1 };
      }
      if (result.fields.password) return { attempt, saved, password: result.fields.password };
      return { attempt, saved, error: errorMessage(result, "vous") };
    },
    { attempt: 0, saved: 0 },
  );

  const errors = [
    state.password && { field: FIELD_ID, message: state.password },
    state.error && { message: state.error },
  ].filter((item) => !!item);

  return (
    <>
      <Button variant="outline" block icon="lock" onClick={() => setOpen(true)}>
        Réinitialiser le mot de passe
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Nouveau mot de passe pour ${firstName}`}
        className="max-w-110 items-stretch text-left"
      >
        {/* Chaque ouverture repart d'un formulaire vide (`key`). */}
        <form key={state.saved} onSubmit={submitWith(action)} noValidate className="flex flex-col gap-4">
          <p className="m-0">
            {username && (
              <>
                Identifiant : <b className="text-ink-900">{username}</b>.{" "}
              </>
            )}
            L&apos;ancien mot de passe ne fonctionnera plus.
          </p>
          <ErrorSummary title="Réinitialisation impossible :" errors={errors} focusKey={state.attempt} />
          <div id={FIELD_ID} tabIndex={-1} className="outline-none">
            <NewPasswordFields
              label="Nouveau mot de passe"
              confirmLabel="Confirmation"
              error={state.password}
              showErrors={!!state.password}
            />
          </div>
          <p className="m-0 flex items-start gap-2.5 rounded-lg bg-amber-50 p-3.5 text-sm font-bold text-amber-700">
            <span aria-hidden>💬</span>
            Communiquez-le à votre enfant.
          </p>
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button variant="outline" block onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" block loading={pending}>
              Enregistrer
            </Button>
          </div>
        </form>
      </Modal>
      {state.saved > 0 && (
        <SavedToast key={state.saved} title={`Le mot de passe de ${firstName} est modifié. Communiquez-le-lui.`} />
      )}
    </>
  );
}
