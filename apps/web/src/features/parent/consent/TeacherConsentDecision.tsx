"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ds/Button";
import { ChoiceCardGroup } from "@/components/ds/ChoiceCard";
import { ErrorSummary } from "@/components/ds/ErrorSummary";
import { Field } from "@/components/ds/Field";
import { Input } from "@/components/ds/Input";
import { PasswordInput } from "@/components/ds/PasswordInput";
import { PwReq, isPasswordValid } from "@/components/ds/PwReq";
import { useAcceptConsent, type AcceptPreparation } from "@/features/consent/use-accept-consent";
import { isUsernameAvailable, suggestUsername, USERNAME_RULE, USERNAME_TAKEN } from "@/features/parent/children/username";
import { isValidUsername } from "@/lib/auth/identifier";
import { submitWith } from "@/lib/form";
import { routes } from "@/lib/routes";

import { RefuseConsentDialog } from "./RefuseConsentDialog";

/** Enfant déjà rattaché au parent, qui peut rejoindre la classe sans nouvel identifiant (C11). */
export type ExistingChild = { id: number; firstName: string; lastName: string };

const NEW_ACCOUNT = "nouveau";
const IDS = { username: "invitation-identifiant", password: "invitation-mot-de-passe", learnerId: "invitation-enfant" };

const PASSWORD_RULE = "Choisissez un mot de passe qui respecte les règles.";

/**
 * Message d'un champ au vouvoiement : ceux du formulaire passent tels quels, les codes de l'API (`USERNAME_TAKEN`,
 * `VALIDATION_ERROR`, `NOT_FOUND`) deviennent le texte du champ ; un autre champ garde le message de l'API.
 */
function fieldMessage(name: string, message: string): string {
  if (name === "username") {
    if (message === USERNAME_RULE || message === USERNAME_TAKEN) return message;
    return message === "USERNAME_TAKEN" ? USERNAME_TAKEN : USERNAME_RULE;
  }
  if (name === "password") return PASSWORD_RULE;
  if (name === "learnerId") return "Cet enfant n'est pas rattaché à votre compte.";
  return message;
}

/**
 * Décision de WPD05 sur une invitation d'enseignant (D60, C11) : créer le compte de l'enfant (identifiant proposé
 * d'après son nom et mot de passe, règles de WPD04) ou, si le parent a déjà des enfants, rattacher l'un d'eux à la
 * classe sans nouvel identifiant. L'élève rejoint la classe dès l'acceptation. « Refuser » ouvre la modale de refus.
 */
export function TeacherConsentDecision({
  id,
  firstName,
  lastName,
  classroomName,
  kids,
}: {
  id: number;
  firstName: string;
  lastName: string;
  classroomName: string;
  kids: ExistingChild[];
}) {
  const router = useRouter();
  const [refusing, setRefusing] = useState(false);
  const [choice, setChoice] = useState(NEW_ACCOUNT);
  const [password, setPassword] = useState("");
  const creating = choice === NEW_ACCOUNT;

  const prepare = async (form: FormData): Promise<AcceptPreparation> => {
    if (!creating) return { body: { learnerId: Number(choice) } };
    const username = String(form.get("username") ?? "").trim();
    const fields: Record<string, string> = {};
    if (!isValidUsername(username)) fields.username = USERNAME_RULE;
    if (!isPasswordValid(password)) fields.password = PASSWORD_RULE;
    if (Object.keys(fields).length === 0 && (await isUsernameAvailable(username)) === false) {
      fields.username = USERNAME_TAKEN;
    }
    return Object.keys(fields).length > 0 ? { fields } : { body: { username, password } };
  };
  const [state, action, pending] = useAcceptConsent(id, () => router.push(routes.parent.consentAccepted(id)), prepare);

  const fields = Object.fromEntries(
    Object.entries(state.fields ?? {}).map(([name, message]) => [name, fieldMessage(name, message)]),
  );
  const errors = [
    ...Object.entries(fields).map(([name, message]) => ({
      field: IDS[name as keyof typeof IDS],
      message,
    })),
    ...(state.error ? [{ message: state.error }] : []),
  ];
  const options = [
    { value: NEW_ACCOUNT, emoji: "✨", label: `Créer le compte de ${firstName}` },
    ...kids.map((kid) => ({ value: String(kid.id), emoji: "🔗", label: `Rattacher ${kid.firstName} à la classe` })),
  ];

  return (
    <>
      <form onSubmit={submitWith(action)} noValidate aria-label="Accepter l'invitation" className="flex flex-col gap-4">
        <ErrorSummary title="Acceptation impossible :" errors={errors} focusKey={state.attempt} />
        {kids.length > 0 && (
          <ChoiceCardGroup
            legend={`${firstName} a-t-il déjà un compte Steamy ?`}
            name="choix"
            options={options}
            value={choice}
            onChange={setChoice}
            error={fields.learnerId}
          />
        )}
        {creating ? (
          <>
            <Field
              label="Identifiant"
              id={IDS.username}
              required
              hint={`Servira à la connexion de ${firstName} (ex. prénom.nom), sans « @ » ni uniquement des chiffres.`}
              error={fields.username}
            >
              <Input
                name="username"
                icon="user"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                defaultValue={suggestUsername(firstName, lastName)}
              />
            </Field>
            <div className="flex flex-col gap-2.5">
              <Field
                label="Mot de passe initial"
                id={IDS.password}
                required
                hint="Vous pourrez le réinitialiser depuis son profil."
                error={fields.password}
              >
                <PasswordInput
                  name="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-describedby="invitation-regles-mot-de-passe"
                />
              </Field>
              <PwReq id="invitation-regles-mot-de-passe" password={password} error={!!fields.password} />
            </div>
          </>
        ) : (
          <p className="m-0 rounded-lg bg-ink-50 p-3.5 text-sm font-bold text-ink-700">
            {kids.find((kid) => String(kid.id) === choice)?.firstName} rejoint la classe « {classroomName} » avec son
            compte actuel : aucun nouvel identifiant n&apos;est créé.
          </p>
        )}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="submit" variant="secondary" block loading={pending} icon="check">
            Accepter l&apos;invitation
          </Button>
          <Button variant="outline" block onClick={() => setRefusing(true)}>
            Refuser
          </Button>
        </div>
      </form>
      <RefuseConsentDialog id={id} firstName={firstName} open={refusing} onClose={() => setRefusing(false)} />
    </>
  );
}
