"use client";

import { useRouter } from "next/navigation";
import { useActionState } from "react";

import { Button } from "@/components/ds/Button";
import { ErrorSummary } from "@/components/ds/ErrorSummary";
import { Loader } from "@/components/ds/Loader";
import { NewPasswordFields } from "@/components/ds/NewPasswordFields";
import { isPasswordValid } from "@/components/ds/PwReq";
import { apiCall, errorMessage } from "@/lib/api-call";
import { clearFlow, readFlow } from "@/lib/auth/flow-storage";
import { submitWith } from "@/lib/form";

import { useParentChallenge } from "../useParentChallenge";

type State = { attempt: number; password?: string; error?: string };

/**
 * WP03 · Mot de passe (D25) : le compte parent est créé avec le numéro vérifié et la session s'ouvre. Arrivé par le
 * lien SMS de l'enfant, le parent va directement à la demande ; sinon, WP04.
 */
export function ParentPasswordForm() {
  const router = useRouter();
  const [challenge] = useParentChallenge();

  const [state, action, pending] = useActionState(async (previous: State, form: FormData): Promise<State> => {
    const attempt = previous.attempt + 1;
    const password = String(form.get("password"));
    if (!isPasswordValid(password) || password !== form.get("passwordConfirm")) {
      return { attempt, password: "Choisissez un mot de passe qui respecte les règles, saisi deux fois à l'identique." };
    }
    const result = await apiCall((api) => api.POST("/api/auth/parent-signup/password/", { body: { password } }));
    if (result.ok) {
      clearFlow("parentChallenge");
      router.replace(readFlow<string>("consentToken") ? "/consentement" : "/inscription/parent/demande");
      router.refresh();
      return { attempt };
    }
    if (result.code === "PASSWORD_TOO_WEAK" || result.fields.password) {
      return { attempt, password: result.fields.password ?? result.message };
    }
    return { attempt, error: errorMessage(result, "vous") };
  }, { attempt: 0 });

  if (!challenge) return <Loader label="Chargement…" />;

  const errors = [state.password && { message: state.password }, state.error && { message: state.error }].filter(
    (item) => !!item,
  );

  return (
    <form onSubmit={submitWith(action)} noValidate className="flex flex-col gap-4">
      <ErrorSummary title="Corrigez les erreurs suivantes :" errors={errors} focusKey={state.attempt} />
      <NewPasswordFields
        confirmLabel="Confirmez votre mot de passe"
        mismatchMessage="Les deux mots de passe ne correspondent pas."
        error={state.password}
        showErrors={state.attempt > 0}
      />
      <Button type="submit" block size="lg" loading={pending} className="mt-3">
        Valider mon mot de passe
      </Button>
    </form>
  );
}
