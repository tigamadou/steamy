"use client";

import type { Schemas } from "@steamy/api-client";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

import { Button } from "@/components/ds/Button";
import { ChoiceCardGroup } from "@/components/ds/ChoiceCard";
import { ErrorSummary } from "@/components/ds/ErrorSummary";
import { Field } from "@/components/ds/Field";
import { Input } from "@/components/ds/Input";
import { PasswordInput } from "@/components/ds/PasswordInput";
import { PwReq, isPasswordValid } from "@/components/ds/PwReq";
import { ReferentialSelect } from "@/components/ds/ReferentialSelect";
import { localityLabel } from "@/features/account/locality";
import { apiCall, errorMessage } from "@/lib/api-call";
import { isValidUsername } from "@/lib/auth/identifier";
import { submitWith } from "@/lib/form";
import { GENDERS, type Gender } from "@/lib/genders";
import { routes } from "@/lib/routes";
import { useReferential } from "@/lib/use-referential";

import type { ChildDetail } from "./api";
import { isUsernameAvailable as isAvailable, USERNAME_RULE, USERNAME_TAKEN } from "./username";

/** Champs du formulaire (noms de l'API) et identifiant de leur contrôle (liens du récapitulatif d'erreurs). */
const FIELD_IDS = {
  firstName: "prenom",
  lastName: "nom",
  birthDate: "naissance",
  relationship: "lien",
  username: "identifiant",
  password: "mot-de-passe",
  schoolGrade: "classe",
  locality: "localite",
  gender: "genre",
  disability: "handicap",
} as const;

type FieldName = keyof typeof FIELD_IDS;
type Errors = Partial<Record<FieldName, string>>;
type State = { attempt: number; fields: Errors; error?: string };

export { USERNAME_RULE, USERNAME_TAKEN };

/** Genre facultatif (D6) : la réponse peut être retirée. */
const GENDER_OPTIONS = [...GENDERS, { value: "", emoji: "🤫", label: "Ne pas dire" }];

function referentialStatus(status: "idle" | "loading" | "error" | "ready") {
  return status === "idle" ? "loading" : status;
}

/** Erreurs de l'API : sous leur champ (`fields`), le reste en tête du formulaire. */
function failureState(attempt: number, result: Parameters<typeof errorMessage>[0] & { fields: Record<string, string> }): State {
  const entries = Object.entries(result.fields);
  if (entries.length === 0) return { attempt, fields: {}, error: errorMessage(result, "vous") };
  const known = Object.fromEntries(entries.filter(([name]) => name in FIELD_IDS));
  const other = entries.filter(([name]) => !(name in FIELD_IDS)).map(([, message]) => message);
  return { attempt, fields: known, error: other.length > 0 ? other.join(" ") : undefined };
}

const text = (form: FormData, name: string) => String(form.get(name) ?? "").trim();

/**
 * `ChildForm` · WPD04 (création, sans `child`) et WPD10 (modification).
 *
 * - WPD04 : prénom, nom, date de naissance (10-17 ans, contrôlée par le serveur, D23), lien de parenté (D51),
 *   identifiant (C7 : ni « @ » ni chiffres seuls ; disponibilité vérifiée comme en W19), mot de passe initial
 *   (`PwReq`, D25). Redirection vers WPD03 avec le rappel de l'identifiant.
 * - WPD10 : identifiant non modifiable (C12), date de naissance cohérente avec l'âge déclaré
 *   (`BIRTHDATE_AGE_MISMATCH`), classe, localité qualifiée (D75), genre et handicap facultatifs avec leur finalité
 *   (D6). Le mot de passe se gère dans WPD03.
 */
export function ChildForm({ child }: { child?: ChildDetail }) {
  const router = useRouter();
  const creating = !child;
  const relationships = useReferential("relationships");
  const grades = useReferential("school-grades");
  const countries = useReferential("countries");
  const disabilities = useReferential("disabilities");

  const [relationship, setRelationship] = useState("");
  const [password, setPassword] = useState("");
  const [usernameError, setUsernameError] = useState<string>();
  const [schoolGrade, setSchoolGrade] = useState(child?.schoolGrade?.code ?? "");
  const [country, setCountry] = useState(child?.locality?.country ?? "");
  const localities = useReferential("localities", { country });
  const [locality, setLocality] = useState(child?.locality ? String(child.locality.id) : "");
  const [gender, setGender] = useState<string>(child?.gender ?? "");
  const [disability, setDisability] = useState(child?.disability?.code ?? "");

  const checkUsername = async (username: string) => {
    if (!isValidUsername(username)) return;
    if ((await isAvailable(username)) === false) setUsernameError(USERNAME_TAKEN);
  };

  const [state, action, pending] = useActionState(
    async (previous: State, form: FormData): Promise<State> => {
      const attempt = previous.attempt + 1;
      const firstName = text(form, "firstName");
      const lastName = text(form, "lastName");
      const birthDate = text(form, "birthDate");
      const fields: Errors = {};
      if (!firstName) fields.firstName = "Indiquez le prénom de votre enfant.";
      if (!lastName) fields.lastName = "Indiquez le nom de votre enfant.";
      if (!birthDate) fields.birthDate = "Indiquez la date de naissance de votre enfant.";

      if (!child) {
        const username = text(form, "username");
        if (!relationship) fields.relationship = "Choisissez votre lien de parenté.";
        if (!isValidUsername(username)) fields.username = USERNAME_RULE;
        if (!isPasswordValid(password)) fields.password = "Choisissez un mot de passe qui respecte les règles.";
        if (Object.keys(fields).length === 0 && (await isAvailable(username)) === false) {
          fields.username = USERNAME_TAKEN;
        }
        if (Object.keys(fields).length > 0) return { attempt, fields };
        const result = await apiCall((api) =>
          api.POST("/api/accounts/children/", {
            body: { firstName, lastName, birthDate, relationship, username, password },
          }),
        );
        if (result.ok) {
          router.push(routes.parent.child(result.data.id, "cree"));
          return { attempt, fields: {} };
        }
        return failureState(attempt, result);
      }

      if (Object.keys(fields).length > 0) return { attempt, fields };
      const body: Schemas["PatchedChildUpdateRequest"] = {
        firstName,
        lastName,
        birthDate,
        gender: (gender || null) as Gender | null,
        disability: disability || null,
        // Classe et localité ne se retirent pas : envoyées seulement une fois choisies
        ...(schoolGrade ? { schoolGrade } : {}),
        ...(locality ? { locality: Number(locality) } : {}),
      };
      const result = await apiCall((api) =>
        api.PATCH("/api/accounts/children/{id}/", { params: { path: { id: String(child.id) } }, body }),
      );
      if (result.ok) {
        router.push(routes.parent.child(child.id, "modifie"));
        return { attempt, fields: {} };
      }
      return failureState(attempt, result);
    },
    { attempt: 0, fields: {} },
  );

  const fieldError = (name: FieldName) => (name === "username" ? state.fields.username ?? usernameError : state.fields[name]);
  const errors = [
    ...(Object.keys(FIELD_IDS) as FieldName[])
      .filter((name) => state.fields[name])
      .map((name) => ({ field: FIELD_IDS[name], message: state.fields[name] as string })),
    ...(state.error ? [{ message: state.error }] : []),
  ];
  const localityItems = localities.items?.map((item) => ({
    id: item.id,
    code: String(item.id),
    label: localityLabel(item),
  }));

  return (
    <form onSubmit={submitWith(action)} noValidate className="flex flex-col gap-4">
      <ErrorSummary title="Corrigez les erreurs suivantes :" errors={errors} focusKey={state.attempt} />

      <div className="flex flex-col gap-4 rounded-[22px] border-2 border-ink-100 bg-surface p-5 sm:p-7">
        {creating && (
          <div className="flex items-center gap-3.5">
            <span aria-hidden className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary-100 text-[28px]">
              ➕
            </span>
            <div>
              <h2 className="m-0 text-lg font-black text-ink-900 sm:text-xl">Créer le compte de votre enfant</h2>
              <p className="m-0 mt-1 text-sm font-semibold text-ink-600">
                Vous définissez son accès. Communiquez-lui ensuite son identifiant et son mot de passe.
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prénom" id={FIELD_IDS.firstName} required error={fieldError("firstName")}>
            <Input name="firstName" autoComplete="off" defaultValue={child?.firstName} />
          </Field>
          <Field label="Nom" id={FIELD_IDS.lastName} required error={fieldError("lastName")}>
            <Input name="lastName" autoComplete="off" defaultValue={child?.lastName} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Date de naissance"
            id={FIELD_IDS.birthDate}
            required
            hint={creating ? "Steamy accueille les 10-17 ans." : "Cohérente avec l'âge indiqué à l'inscription."}
            error={fieldError("birthDate")}
          >
            <Input type="date" name="birthDate" autoComplete="off" defaultValue={child?.birthDate} />
          </Field>
          {creating ? (
            <Field label="Lien de parenté" id={FIELD_IDS.relationship} required error={fieldError("relationship")}>
              <ReferentialSelect
                items={relationships.items}
                status={referentialStatus(relationships.status)}
                onRetry={relationships.retry}
                value={relationship}
                onChange={setRelationship}
                placeholder="Vous êtes…"
              />
            </Field>
          ) : (
            <Field label="Classe" id={FIELD_IDS.schoolGrade} error={fieldError("schoolGrade")}>
              <ReferentialSelect
                items={grades.items}
                status={referentialStatus(grades.status)}
                onRetry={grades.retry}
                value={schoolGrade}
                onChange={setSchoolGrade}
                placeholder="Choisissez…"
              />
            </Field>
          )}
        </div>

        {creating ? (
          <>
            <Field
              label="Identifiant"
              id={FIELD_IDS.username}
              required
              hint="Servira à sa connexion (ex. prénom.nom), sans « @ » ni uniquement des chiffres."
              error={fieldError("username")}
            >
              <Input
                name="username"
                icon="user"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                onBlur={(event) => void checkUsername(event.target.value.trim())}
                onChange={() => setUsernameError(undefined)}
              />
            </Field>
            <div className="flex flex-col gap-2.5">
              <Field
                label="Mot de passe initial"
                id={FIELD_IDS.password}
                required
                hint="Vous pourrez le réinitialiser depuis son profil."
                error={fieldError("password")}
              >
                <PasswordInput
                  name="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-describedby="regles-mot-de-passe"
                />
              </Field>
              <PwReq id="regles-mot-de-passe" password={password} error={!!state.fields.password} />
            </div>
            <p className="m-0 flex items-start gap-3 rounded-[14px] border-2 border-primary-100 bg-primary-50 p-3.5 text-[13px] font-bold text-ink-700">
              <span aria-hidden className="text-xl">
                🔑
              </span>
              Notez bien ces identifiants : votre enfant en aura besoin pour se connecter, puis complétera son profil.
              Vous gardez le contrôle de son compte et de ses achats.
            </p>
          </>
        ) : (
          <>
            <p className="m-0 text-sm font-semibold text-ink-600">
              Identifiant : <b className="text-ink-900">{child.username}</b> (il ne peut pas être modifié).
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Pays" id="pays">
                <ReferentialSelect
                  items={countries.items}
                  status={referentialStatus(countries.status)}
                  onRetry={countries.retry}
                  value={country}
                  onChange={(next) => {
                    setCountry(next);
                    setLocality("");
                  }}
                  placeholder="Choisissez…"
                />
              </Field>
              <Field label="Localité (ville / quartier)" id={FIELD_IDS.locality} error={fieldError("locality")}>
                <ReferentialSelect
                  items={localityItems}
                  status={referentialStatus(localities.status)}
                  onRetry={localities.retry}
                  value={locality}
                  onChange={setLocality}
                  placeholder="Choisissez…"
                />
              </Field>
            </div>
            <ChoiceCardGroup
              legend="Genre (facultatif)"
              name="gender"
              options={GENDER_OPTIONS}
              value={gender}
              onChange={setGender}
              error={fieldError("gender")}
            />
            <Field label="Situation de handicap (facultatif)" id={FIELD_IDS.disability} error={fieldError("disability")}>
              <ReferentialSelect
                items={disabilities.items}
                status={referentialStatus(disabilities.status)}
                onRetry={disabilities.retry}
                value={disability}
                onChange={setDisability}
                placeholder="Aucune, ou je préfère ne pas répondre"
              />
            </Field>
            <p className="m-0 flex items-start gap-2.5 rounded-lg bg-info-50 p-3.5 text-sm font-bold text-info-700">
              <span aria-hidden>🔒</span>
              Le genre et la situation de handicap sont facultatifs. Ils servent seulement à adapter les parcours et à
              mesurer, de façon anonyme, si Steamy profite à tous. Ils ne sont jamais vendus ni montrés aux autres.
            </p>
          </>
        )}
      </div>

      {creating ? (
        <Button type="submit" block size="lg" loading={pending}>
          Créer le compte
        </Button>
      ) : (
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" href={routes.parent.child(child.id)}>
            Annuler
          </Button>
          <Button type="submit" loading={pending}>
            Enregistrer
          </Button>
        </div>
      )}
    </form>
  );
}
