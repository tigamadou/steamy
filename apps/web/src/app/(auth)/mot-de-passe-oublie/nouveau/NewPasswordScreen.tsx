"use client";

import { useRouter } from "next/navigation";
import { useActionState } from "react";

import { Button } from "@/components/ds/Button";
import { ErrorSummary } from "@/components/ds/ErrorSummary";
import { Mascot } from "@/components/ds/Mascot";
import { NewPasswordFields } from "@/components/ds/NewPasswordFields";
import { isPasswordValid } from "@/components/ds/PwReq";
import { WebShell } from "@/components/ds/WebShell";
import { apiCall, errorMessage } from "@/lib/api-call";
import { submitWith } from "@/lib/form";

import { RESTART_NOTICE, useResetFlow } from "../ResetFlow";
import { useFlowGuard } from "../useFlowGuard";

type State = { attempt: number; password?: string; error?: string };

/** WL04 · Nouveau mot de passe (D25) ; les sessions ouvertes ailleurs sont fermées par l'API. */
export function NewPasswordScreen() {
  const router = useRouter();
  const { flow, update } = useResetFlow();
  const resetToken = flow.resetToken;

  const [state, action, pending] = useActionState(async (previous: State, form: FormData): Promise<State> => {
    const attempt = previous.attempt + 1;
    const password = String(form.get("password"));
    if (!isPasswordValid(password) || password !== form.get("passwordConfirm")) {
      return { attempt, password: "Choisissez un mot de passe qui respecte les règles, saisi deux fois à l'identique." };
    }
    const result = await apiCall((api) =>
      api.POST("/api/auth/password-reset/confirm/", { body: { resetToken: resetToken as string, password } }),
    );
    if (result.ok) {
      // Le jeton (déjà consommé par l'API) reste en mémoire : le vider ici réveillerait la garde de cet écran
      // avant la navigation. Il est remplacé à la prochaine demande de code (WL02).
      router.replace("/mot-de-passe-oublie/termine");
      return { attempt };
    }
    if (result.code === "PASSWORD_TOO_WEAK" || result.fields.password) {
      return { attempt, password: result.fields.password ?? result.message };
    }
    if (result.code === "RESET_TOKEN_INVALID") {
      // Jeton expiré (15 min) ou déjà utilisé : le parcours reprend depuis WL02
      update({ challenge: undefined, resetToken: undefined, notice: RESTART_NOTICE });
      router.replace("/mot-de-passe-oublie");
      return { attempt };
    }
    return { attempt, error: errorMessage(result, "vous") };
  }, { attempt: 0 });

  if (!useFlowGuard(resetToken !== undefined)) return null;

  const errors = [
    ...(state.password ? [{ message: state.password }] : []),
    ...(state.error ? [{ message: state.error }] : []),
  ];

  return (
    <WebShell
      kicker="Réinitialisation · étape 3"
      title="Choisissez un nouveau mot de passe"
      sub="Il remplacera l'ancien sur tous vos appareils."
      brand={<Mascot pose="idle" size={200} hue="var(--surface)" />}
    >
      <form onSubmit={submitWith(action)} noValidate className="flex flex-col gap-4">
        <ErrorSummary title="Enregistrement impossible :" errors={errors} focusKey={state.attempt} />
        <NewPasswordFields
          label="Nouveau mot de passe"
          confirmLabel="Confirmez le mot de passe"
          error={state.password}
          showErrors={state.attempt > 0}
        />
        <Button type="submit" block size="lg" loading={pending} className="mt-3">
          Enregistrer le mot de passe
        </Button>
      </form>
    </WebShell>
  );
}
