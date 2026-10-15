"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

import { Button } from "@/components/ds/Button";
import { ErrorSummary } from "@/components/ds/ErrorSummary";
import { Field } from "@/components/ds/Field";
import { Input } from "@/components/ds/Input";
import { apiCall, errorMessage } from "@/lib/api-call";
import { takeResumeIdentifier } from "@/lib/auth/resume-handoff";
import { submitWith } from "@/lib/form";

import { STEP_PATH } from "../apprenant/signup-steps";

type State = { attempt: number; username?: string; code?: string; error?: string; expired?: boolean };

/**
 * Reprise d'une inscription en attente (C5, D21) : identifiant + code de reprise rouvrent la session « inscription
 * en cours », puis l'écran de l'étape réelle (W06, W07, W08 ou W18). L'identifiant peut venir de W16.
 */
export function ResumeForm() {
  const router = useRouter();
  const [identifier] = useState(() => takeResumeIdentifier() ?? "");

  const [state, action, pending] = useActionState(async (previous: State, form: FormData): Promise<State> => {
    const attempt = previous.attempt + 1;
    const username = String(form.get("username")).trim();
    const resumeCode = String(form.get("resumeCode")).trim();
    if (!username || !resumeCode) {
      return {
        attempt,
        username: username ? undefined : "Indique ton identifiant.",
        code: resumeCode ? undefined : "Indique ton code de reprise.",
      };
    }
    const result = await apiCall((api) =>
      api.POST("/api/auth/learner-signup/resume/", { body: { username, resumeCode } }),
    );
    if (result.ok) {
      router.replace(STEP_PATH[result.data.step]);
      return { attempt };
    }
    if (result.code === "RESUME_CODE_INVALID") {
      return { attempt, error: "Identifiant ou code de reprise incorrect. Vérifie ce que tu as noté." };
    }
    if (result.code === "SIGNUP_EXPIRED") {
      return { attempt, expired: true, error: "Cette inscription a expiré : tu peux recommencer depuis le début." };
    }
    return { attempt, error: errorMessage(result, "tu") };
  }, { attempt: 0 });

  const errors = [
    state.username && { field: "reprise-identifiant", message: state.username },
    state.code && { field: "reprise-code", message: state.code },
    state.error && { message: state.error },
  ].filter((item) => !!item);

  return (
    <form onSubmit={submitWith(action)} noValidate className="flex flex-col gap-4">
      <ErrorSummary errors={errors} focusKey={state.attempt} />
      {state.expired && (
        <Button href="/inscription/type" variant="outline">
          Recommencer mon inscription
        </Button>
      )}
      <Field label="Identifiant" id="reprise-identifiant" required error={state.username}>
        <Input
          name="username"
          icon="user"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          defaultValue={identifier}
        />
      </Field>
      <Field
        label="Code de reprise"
        id="reprise-code"
        required
        hint="Le code à 8 caractères affiché quand tu as envoyé la demande à ton parent."
        error={state.code}
      >
        <Input name="resumeCode" icon="lock" autoComplete="off" autoCapitalize="characters" spellCheck={false} />
      </Field>
      <div className="mt-3 flex flex-col gap-3">
        <Button type="submit" block size="lg" loading={pending}>
          Reprendre mon inscription
        </Button>
        <p className="text-center text-sm font-bold text-ink-600">
          Code perdu ?{" "}
          <Link href="/inscription/type" className="font-black text-primary-600 underline">
            Recommence ton inscription
          </Link>
        </p>
      </div>
    </form>
  );
}
