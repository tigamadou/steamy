"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState } from "react";

import { Button } from "@/components/ds/Button";
import { ErrorSummary } from "@/components/ds/ErrorSummary";
import { Field } from "@/components/ds/Field";
import { Input } from "@/components/ds/Input";
import { Mascot } from "@/components/ds/Mascot";
import { PhoneInput } from "@/components/ds/PhoneInput";
import { WebShell } from "@/components/ds/WebShell";
import { apiCall, errorMessage } from "@/lib/api-call";
import { useReferential } from "@/lib/use-referential";

import { useResetFlow } from "./ResetFlow";

type State = { attempt: number; field?: string; error?: string };

/**
 * WL02 · Mot de passe oublié (D26, C6) : numéro du parent par défaut, email pour l'enseignant. La réponse de l'API
 * est la même que le compte existe ou non : on passe toujours à WL03.
 */
export function ForgotScreen() {
  const router = useRouter();
  const { flow, update } = useResetFlow();
  const { items: countries = [] } = useReferential("countries");
  const email = flow.channel === "email";

  const [state, action, pending] = useActionState(async (previous: State, form: FormData): Promise<State> => {
    const attempt = previous.attempt + 1;
    const identifier = String(form.get("identifier")).trim();
    if (!identifier) {
      return {
        attempt,
        field: email ? "Saisissez votre adresse email." : "Saisissez un numéro de téléphone valide.",
      };
    }
    const result = await apiCall((api) => api.POST("/api/auth/password-reset/", { body: { identifier } }));
    if (!result.ok) {
      return result.fields.identifier
        ? { attempt, field: result.fields.identifier }
        : { attempt, error: errorMessage(result, "vous") };
    }
    update({ challenge: result.data, resetToken: undefined, notice: undefined });
    router.push("/mot-de-passe-oublie/code");
    return { attempt };
  }, { attempt: 0 });

  const errors = [
    ...(state.field ? [{ field: "identifiant-reset", message: state.field }] : []),
    ...(state.error ? [{ message: state.error }] : []),
  ];

  return (
    <WebShell
      kicker="Mot de passe oublié"
      title="Pas de panique !"
      sub={
        email
          ? "Indiquez l'adresse email de votre compte enseignant : nous vous envoyons un code pour réinitialiser votre mot de passe."
          : "Indiquez votre numéro de téléphone : nous vous envoyons un code par SMS pour réinitialiser votre mot de passe."
      }
      brand={
        <>
          <Mascot pose="focus" size={220} hue="var(--surface)" />
          <span aria-hidden className="text-6xl">
            🔑
          </span>
        </>
      }
    >
      <form action={action} noValidate className="flex flex-col gap-4">
        {flow.notice && (
          <p role="status" className="rounded-lg bg-info-50 p-4 text-sm font-bold text-info-700">
            {flow.notice}
          </p>
        )}
        <ErrorSummary title="Envoi impossible :" errors={errors} focusKey={state.attempt} />
        {email ? (
          <Field label="Adresse email" id="identifiant-reset" required error={state.field}>
            <Input key="email" type="email" name="identifier" autoComplete="email" inputMode="email" />
          </Field>
        ) : (
          <Field
            label="Numéro de téléphone"
            id="identifiant-reset"
            required
            hint="Le numéro lié à votre compte Steamy."
            error={state.field}
          >
            <PhoneInput key="phone" countries={countries} name="identifier" />
          </Field>
        )}
        <Button variant="ghost" size="sm" className="self-start" onClick={() => update({ channel: email ? "sms" : "email" })}>
          {email ? "Recevoir le code par SMS" : "Vous êtes enseignant ? Recevoir le code par email"}
        </Button>
        <div className="mt-3 flex flex-col gap-3">
          <Button type="submit" block size="lg" loading={pending}>
            Recevoir le code
          </Button>
          <p className="text-center text-sm font-bold text-ink-600">
            Vous vous en souvenez ?{" "}
            <Link href="/connexion" className="font-black text-primary-600 underline">
              Se connecter
            </Link>
          </p>
        </div>
      </form>
    </WebShell>
  );
}
