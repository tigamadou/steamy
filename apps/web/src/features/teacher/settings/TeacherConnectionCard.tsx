"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

import { Button, ErrorSummary, Field, Input, PasswordInput } from "@/components/ds";
import { EditableCard } from "@/features/account/EditableCard";
import { PasswordForm } from "@/features/account/PasswordForm";
import { SavedToast } from "@/features/account/SavedToast";
import { apiCall, errorMessage } from "@/lib/api-call";
import { submitWith } from "@/lib/form";

type Mode = "email" | "password" | null;
type State = { attempt: number; email?: string; password?: string; error?: string; changed: number };

/**
 * Changement d'adresse email (S4) : c'est l'identifiant de connexion de l'enseignant, il demande son mot de passe
 * actuel (`POST accounts/me/email/`). Le serveur décide de l'unicité (`EMAIL_TAKEN`).
 */
function EmailChange({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [state, action, pending] = useActionState(
    async (previous: State, form: FormData): Promise<State> => {
      const attempt = previous.attempt + 1;
      const changed = previous.changed;
      const email = String(form.get("email") ?? "").trim();
      const password = String(form.get("password") ?? "");
      const errors: State = { attempt, changed };
      if (!email) errors.email = "Indiquez votre nouvelle adresse email.";
      if (!password) errors.password = "Indiquez votre mot de passe actuel.";
      if (errors.email || errors.password) return errors;
      const result = await apiCall((api) => api.POST("/api/accounts/me/email/", { body: { email, password } }));
      if (result.ok) {
        onDone();
        return { attempt, changed: changed + 1 };
      }
      if (result.code === "EMAIL_TAKEN") return { attempt, changed, email: "Cette adresse est déjà utilisée par un autre compte." };
      if (result.code === "INVALID_CREDENTIALS") return { attempt, changed, password: "Mot de passe incorrect." };
      if (result.fields.email || result.fields.password) {
        return { attempt, changed, email: result.fields.email, password: result.fields.password };
      }
      return { attempt, changed, error: errorMessage(result, "vous") };
    },
    { attempt: 0, changed: 0 },
  );

  const errors = [
    state.email && { field: "connexion-email", message: state.email },
    state.password && { field: "connexion-mot-de-passe", message: state.password },
    state.error && { message: state.error },
  ].filter((item) => !!item);

  return (
    <form onSubmit={submitWith(action)} noValidate aria-label="Changer d'adresse email" className="flex flex-col gap-4">
      <ErrorSummary title="Corrigez les erreurs suivantes :" errors={errors} focusKey={state.attempt} />
      <Field
        label="Nouvelle adresse email"
        id="connexion-email"
        required
        hint="Elle devient votre identifiant de connexion."
        error={state.email}
      >
        <Input name="email" type="email" autoComplete="email" />
      </Field>
      <Field label="Mot de passe actuel" id="connexion-mot-de-passe" required error={state.password}>
        <PasswordInput name="password" autoComplete="current-password" />
      </Field>
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="ghost" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" loading={pending}>
          Enregistrer l&apos;adresse
        </Button>
      </div>
    </form>
  );
}

/**
 * Connexion de WT08 (S4) : l'adresse email, identifiant de connexion, et le mot de passe (règles `PwReq`, D25). Pas de
 * téléphone de connexion.
 */
export function TeacherConnectionCard({ email }: { email: string | null }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(null);
  const [changed, setChanged] = useState(0);

  return (
    <>
      <EditableCard
        title="Connexion"
        editing={mode !== null}
        onEdit={() => setMode("email")}
        editLabel="Changer d'adresse"
        rows={[
          { label: "Adresse email", value: email },
          { label: "Mot de passe", value: "••••••••" },
        ]}
      >
        {mode === "email" ? (
          <EmailChange
            onCancel={() => setMode(null)}
            onDone={() => {
              setMode(null);
              setChanged((n) => n + 1);
              router.refresh();
            }}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <PasswordForm register="vous" />
            <Button variant="ghost" onClick={() => setMode(null)} className="self-end">
              Fermer
            </Button>
          </div>
        )}
      </EditableCard>
      {mode === null && (
        <Button variant="outline" size="sm" onClick={() => setMode("password")} className="self-start">
          Changer de mot de passe
        </Button>
      )}
      {changed > 0 && (
        <SavedToast key={changed} title="Votre adresse est modifiée. Utilisez-la désormais pour vous connecter." />
      )}
    </>
  );
}
