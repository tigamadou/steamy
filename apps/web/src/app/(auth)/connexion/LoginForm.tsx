"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

import { Button } from "@/components/ds/Button";
import { ErrorSummary } from "@/components/ds/ErrorSummary";
import { Field } from "@/components/ds/Field";
import { IdentifierInput } from "@/components/ds/IdentifierInput";
import { PasswordInput } from "@/components/ds/PasswordInput";
import { homeForRole } from "@/lib/auth/home-for-role";
import { login, type LoginFailure } from "@/lib/auth/login";
import { setResumeIdentifier } from "@/lib/auth/resume-handoff";
import { useReferential } from "@/lib/use-referential";

import { ForgotPasswordChoice } from "./ForgotPasswordChoice";

const HELP_HREF = "/aide?sujet=question#contact";

type FieldErrors = { identifier?: string; password?: string };
type State = { attempt: number; fields?: FieldErrors; failure?: LoginFailure };

// Textes de W16 au tutoiement ; le message de l'API ne sert que pour un code sans texte propre (D4).
function failureMessage(failure: LoginFailure): string {
  switch (failure.code) {
    case "INVALID_CREDENTIALS":
      // Message unique, y compris pour un compte du personnel (C7) : aucun indice sur l'existence du compte
      return "Identifiant ou mot de passe incorrect.";
    case "ACCOUNT_PENDING_CONSENT":
      return "Ton inscription attend encore l'accord de ton parent.";
    case "ACCOUNT_SUSPENDED":
      return "Ce compte est suspendu.";
    case "ACCOUNT_DEACTIVATED":
      return "Ce compte est désactivé.";
    case "THROTTLED":
      return failure.retryAfter
        ? `Trop de tentatives. Réessaie dans ${failure.retryAfter} secondes.`
        : "Trop de tentatives. Réessaie dans quelques instants.";
    default:
      return failure.message;
  }
}

/** Formulaire de W16 : un seul écran pour l'apprenant, le parent et l'enseignant (S4). */
export function LoginForm({ next }: { next: string | null }) {
  const router = useRouter();
  const { items: countries = [] } = useReferential("countries");
  const [raw, setRaw] = useState("");

  const [state, action, pending] = useActionState(async (previous: State, form: FormData): Promise<State> => {
    const attempt = previous.attempt + 1;
    // Les deux champs sont toujours présents dans ce formulaire (le champ caché d'`IdentifierInput` compris)
    const identifier = String(form.get("identifier"));
    const password = String(form.get("password"));
    const fields: FieldErrors = {};
    if (!identifier) fields.identifier = "Saisis ton identifiant ou ton numéro.";
    if (!password) fields.password = "Saisis ton mot de passe.";
    if (fields.identifier || fields.password) return { attempt, fields };

    const result = await login(identifier, password);
    if (!result.ok) return { attempt, failure: result };
    // Retour arrière impossible vers la connexion une fois connecté
    router.replace(next ?? homeForRole(result.user));
    router.refresh();
    return { attempt };
  }, { attempt: 0 });

  const errors = [
    ...(state.fields?.identifier ? [{ field: "identifiant", message: state.fields.identifier }] : []),
    ...(state.fields?.password ? [{ field: "mot-de-passe", message: state.fields.password }] : []),
    ...(state.failure ? [{ message: failureMessage(state.failure) }] : []),
  ];
  const code = state.failure?.code;

  const resume = () => {
    setResumeIdentifier(raw.trim());
    router.push("/inscription/reprendre");
  };

  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <ErrorSummary title="Connexion impossible :" errors={errors} focusKey={state.attempt} />
      {code === "ACCOUNT_PENDING_CONSENT" && (
        <Button variant="outline" onClick={resume}>
          Reprendre mon inscription
        </Button>
      )}
      {(code === "ACCOUNT_SUSPENDED" || code === "ACCOUNT_DEACTIVATED") && (
        <Link href={HELP_HREF} className="text-sm font-extrabold text-primary-600 underline">
          Contacter l&apos;équipe Steamy
        </Link>
      )}
      <Field label="Identifiant ou numéro" id="identifiant" required error={state.fields?.identifier}>
        <IdentifierInput
          countries={countries}
          name="identifier"
          onChange={(change) => setRaw(change.raw)}
        />
      </Field>
      <Field label="Mot de passe" id="mot-de-passe" required error={state.fields?.password}>
        <PasswordInput autoComplete="current-password" name="password" />
      </Field>
      <ForgotPasswordChoice />
      <div className="mt-3 flex flex-col gap-3">
        <Button type="submit" block size="lg" loading={pending}>
          Se connecter
        </Button>
        <p className="text-center text-sm font-bold text-ink-600">
          Pas de compte ?{" "}
          <Link href="/inscription/type" className="font-black text-primary-600 underline">
            Inscris-toi
          </Link>
        </p>
        <p className="text-center text-sm font-bold text-ink-600">
          Inscription en attente ?{" "}
          <Link href="/inscription/reprendre" className="font-black text-primary-600 underline">
            Reprendre mon inscription
          </Link>
        </p>
      </div>
    </form>
  );
}
