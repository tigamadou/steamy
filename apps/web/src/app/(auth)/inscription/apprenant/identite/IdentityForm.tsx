"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ds/Button";
import { Checkbox } from "@/components/ds/Checkbox";
import { ErrorSummary } from "@/components/ds/ErrorSummary";
import { Field } from "@/components/ds/Field";
import { Input } from "@/components/ds/Input";
import { apiCall } from "@/lib/api-call";
import { isValidUsername } from "@/lib/auth/identifier";
import { routes } from "@/lib/routes";

import { useSignupDraft } from "../SignupDraft";

type Errors = { firstName?: string; lastName?: string; username?: string; privacy?: string };

/** Règle C7 rappelée : l'identifiant ne doit ressembler ni à un email ni à un numéro. */
const USERNAME_RULE =
  "Ton identifiant : 3 à 30 caractères (lettres, chiffres, « . », « _ » ou « - ») avec au moins une lettre, sans « @ ».";
const USERNAME_TAKEN = "Cet identifiant est déjà associé à un compte Steamy.";

/** Disponibilité de l'identifiant : `false` s'il est pris, `null` si l'API ne répond pas (le serveur retranchera). */
async function isAvailable(username: string): Promise<boolean | null> {
  const result = await apiCall((api) =>
    api.GET("/api/auth/username-availability/", { params: { query: { username } } }),
  );
  return result.ok ? result.data.available : null;
}

/** W04 · Identité et identifiant (état W19 quand l'identifiant est pris). */
export function IdentityForm() {
  const router = useRouter();
  const { draft, update } = useSignupDraft();
  const [errors, setErrors] = useState<Errors>(draft.usernameTaken ? { username: USERNAME_TAKEN } : {});
  const [attempt, setAttempt] = useState(0);
  const [checking, setChecking] = useState(false);
  const taken = errors.username === USERNAME_TAKEN;

  const checkUsername = async (username: string) => {
    if (!isValidUsername(username)) return;
    if ((await isAvailable(username)) === false) setErrors((current) => ({ ...current, username: USERNAME_TAKEN }));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values = {
      firstName: String(form.get("firstName")).trim(),
      lastName: String(form.get("lastName")).trim(),
      username: String(form.get("username")).trim(),
      privacyAccepted: form.get("privacy") === "on",
    };
    const next: Errors = {};
    if (!values.firstName) next.firstName = "Indique ton prénom.";
    if (!values.lastName) next.lastName = "Indique ton nom.";
    if (!isValidUsername(values.username)) next.username = USERNAME_RULE;
    if (!values.privacyAccepted) next.privacy = "Accepte les conditions d'utilisation pour continuer.";
    setAttempt((n) => n + 1);
    if (Object.keys(next).length === 0) {
      setChecking(true);
      const available = await isAvailable(values.username);
      setChecking(false);
      if (available === false) next.username = USERNAME_TAKEN;
    }
    setErrors(next);
    update({ ...values, usernameTaken: next.username === USERNAME_TAKEN });
    if (Object.keys(next).length === 0) router.push("/inscription/apprenant/age");
  };

  const chooseAnother = () => {
    setErrors((current) => ({ ...current, username: undefined }));
    document.querySelector<HTMLInputElement>("#identifiant")?.select();
  };

  // Récapitulatif seulement après un envoi : la vérification au blur ne doit pas déplacer le focus
  const summary = attempt === 0 ? [] : [
    errors.firstName && { field: "prenom", message: errors.firstName },
    errors.lastName && { field: "nom", message: errors.lastName },
    errors.username && { field: "identifiant", message: errors.username },
    errors.privacy && { field: "cgu", message: errors.privacy },
  ].filter((item) => !!item);

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <ErrorSummary errors={summary} focusKey={attempt} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prénom" id="prenom" required error={errors.firstName}>
          <Input name="firstName" autoComplete="given-name" defaultValue={draft.firstName} />
        </Field>
        <Field label="Nom" id="nom" required error={errors.lastName}>
          <Input name="lastName" autoComplete="family-name" defaultValue={draft.lastName} />
        </Field>
      </div>
      <Field
        label="Identifiant"
        id="identifiant"
        required
        hint="C'est ce que tu utiliseras pour te connecter."
        error={errors.username}
      >
        <Input
          name="username"
          icon="user"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          defaultValue={draft.username}
          onBlur={(event) => void checkUsername(event.target.value.trim())}
          onChange={() => taken && setErrors((current) => ({ ...current, username: undefined }))}
        />
      </Field>
      {taken && (
        <div className="flex flex-wrap gap-3">
          <Button href={routes.login()} variant="outline" size="sm">
            Se connecter
          </Button>
          <Button variant="ghost" size="sm" onClick={chooseAnother}>
            Choisir un autre identifiant
          </Button>
        </div>
      )}
      <Checkbox
        id="cgu"
        name="privacy"
        defaultChecked={draft.privacyAccepted}
        error={errors.privacy}
        label={
          <>
            J&apos;accepte les{" "}
            <Link href={routes.legal("cgu")} className="font-bold text-primary-600 underline">
              conditions d&apos;utilisation
            </Link>{" "}
            et la{" "}
            <Link href={routes.legal("confidentialite")} className="font-bold text-primary-600 underline">
              politique de confidentialité
            </Link>
            .
          </>
        }
      />
      <div className="mt-3 flex flex-col gap-3">
        <Button type="submit" block size="lg" loading={checking} iconRight="arrow-right">
          Continuer
        </Button>
        <p className="text-center text-sm font-bold text-ink-600">
          Déjà un compte ?{" "}
          <Link href={routes.login()} className="font-black text-primary-600 underline">
            Connecte-toi
          </Link>
        </p>
      </div>
    </form>
  );
}
