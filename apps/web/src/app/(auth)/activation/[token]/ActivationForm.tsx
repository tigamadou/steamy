"use client";

import type { Schemas } from "@steamy/api-client";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { Button } from "@/components/ds/Button";
import { ErrorSummary } from "@/components/ds/ErrorSummary";
import { Mascot } from "@/components/ds/Mascot";
import { NewPasswordFields } from "@/components/ds/NewPasswordFields";
import { isPasswordValid } from "@/components/ds/PwReq";
import { WebShell } from "@/components/ds/WebShell";
import { apiCall, errorMessage } from "@/lib/api-call";

import { InvalidInvitation } from "../InvalidInvitation";

type State = { attempt: number; password?: string; error?: string; invalid?: boolean };

/**
 * Activation du compte enseignant (C6, variante de WL04) : mot de passe choisi, compte créé et session ouverte,
 * puis espace enseignant. Le jeton est retiré de l'historique dès l'affichage.
 */
export function ActivationForm({ token, invitation }: { token: string; invitation: Schemas["TeacherInvitation"] }) {
  const router = useRouter();

  useEffect(() => {
    window.history.replaceState(window.history.state, "", "/activation");
  }, []);

  const [state, action, pending] = useActionState(async (previous: State, form: FormData): Promise<State> => {
    const attempt = previous.attempt + 1;
    const password = String(form.get("password"));
    if (!isPasswordValid(password) || password !== form.get("passwordConfirm")) {
      return { attempt, password: "Choisissez un mot de passe qui respecte les règles, saisi deux fois à l'identique." };
    }
    const result = await apiCall((api) =>
      api.POST("/api/auth/teacher-invitations/{token}/accept/", {
        params: { path: { token } },
        body: { password },
      }),
    );
    if (result.ok) {
      router.replace("/enseignant");
      router.refresh();
      return { attempt };
    }
    if (result.code === "INVITATION_INVALID") return { attempt, invalid: true };
    if (result.code === "PASSWORD_TOO_WEAK" || result.fields.password) {
      return { attempt, password: result.fields.password ?? result.message };
    }
    return { attempt, error: errorMessage(result, "vous") };
  }, { attempt: 0 });

  if (state.invalid) return <InvalidInvitation />;

  const errors = [
    ...(state.password ? [{ message: state.password }] : []),
    ...(state.error ? [{ message: state.error }] : []),
  ];

  return (
    <WebShell
      kicker="Activation du compte"
      title="Activer votre compte"
      sub={
        <>
          Bonjour {invitation.firstName}, choisissez votre mot de passe pour rejoindre Steamy
          {invitation.schoolName ? <> avec {invitation.schoolName}</> : null}. Votre identifiant de connexion est{" "}
          <strong>{invitation.emailMasked}</strong>.
        </>
      }
      brand={<Mascot pose="wave" size={220} hue="var(--surface)" />}
    >
      <form action={action} noValidate className="flex flex-col gap-4">
        <ErrorSummary title="Activation impossible :" errors={errors} focusKey={state.attempt} />
        <NewPasswordFields
          label="Mot de passe"
          confirmLabel="Confirmez le mot de passe"
          error={state.password}
          showErrors={state.attempt > 0}
        />
        <Button type="submit" block size="lg" loading={pending} className="mt-3">
          Activer mon compte
        </Button>
      </form>
    </WebShell>
  );
}
