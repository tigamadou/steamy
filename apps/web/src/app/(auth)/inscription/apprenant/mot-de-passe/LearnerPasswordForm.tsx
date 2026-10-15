"use client";

import { useRouter } from "next/navigation";
import { useActionState } from "react";

import { Button } from "@/components/ds/Button";
import { ErrorSummary } from "@/components/ds/ErrorSummary";
import { NewPasswordFields } from "@/components/ds/NewPasswordFields";
import { isPasswordValid } from "@/components/ds/PwReq";
import { apiCall, errorMessage } from "@/lib/api-call";
import { homeForRole } from "@/lib/auth/home-for-role";

type State = { attempt: number; password?: string; error?: string };

/** W10 · Mot de passe (D25) : le compte devient actif, la session s'ouvre, puis le profil (W11). */
export function LearnerPasswordForm() {
  const router = useRouter();

  const [state, action, pending] = useActionState(async (previous: State, form: FormData): Promise<State> => {
    const attempt = previous.attempt + 1;
    const password = String(form.get("password"));
    if (!isPasswordValid(password) || password !== form.get("passwordConfirm")) {
      return { attempt, password: "Choisis un mot de passe qui respecte les règles, saisi deux fois à l'identique." };
    }
    const result = await apiCall((api) => api.POST("/api/auth/learner-signup/password/", { body: { password } }));
    if (result.ok) {
      router.replace(homeForRole(result.data.user));
      router.refresh();
      return { attempt };
    }
    if (result.code === "PASSWORD_TOO_WEAK" || result.fields.password) {
      return { attempt, password: result.fields.password ?? result.message };
    }
    return { attempt, error: errorMessage(result, "tu") };
  }, { attempt: 0 });

  const errors = [state.password && { message: state.password }, state.error && { message: state.error }].filter(
    (item) => !!item,
  );

  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <ErrorSummary errors={errors} focusKey={state.attempt} />
      <NewPasswordFields error={state.password} showErrors={state.attempt > 0} />
      <Button type="submit" block size="lg" loading={pending} className="mt-3">
        Valider mon mot de passe
      </Button>
    </form>
  );
}
