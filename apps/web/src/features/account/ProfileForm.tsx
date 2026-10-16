"use client";

import type { Schemas } from "@steamy/api-client";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

import { Avatar } from "@/components/ds/Avatar";
import { AvatarPicker } from "@/components/ds/AvatarPicker";
import { Button } from "@/components/ds/Button";
import { ChoiceCardGroup } from "@/components/ds/ChoiceCard";
import { ErrorSummary } from "@/components/ds/ErrorSummary";
import { Field } from "@/components/ds/Field";
import { GoalChipGroup } from "@/components/ds/GoalChip";
import { Input } from "@/components/ds/Input";
import { Loader } from "@/components/ds/Loader";
import { ReferentialSelect } from "@/components/ds/ReferentialSelect";
import { apiCall, errorMessage } from "@/lib/api-call";
import { submitWith } from "@/lib/form";
import { GENDERS, type Gender } from "@/lib/genders";
import { routes } from "@/lib/routes";
import { useReferential } from "@/lib/use-referential";

import { localityLabel, type LearnerProfile } from "./locality";
import { SavedToast } from "./SavedToast";

type ProfileUpdate = Schemas["PatchedLearnerProfileUpdateRequest"];

/** Champs du formulaire et identifiant de leur contrôle (liens du récapitulatif d'erreurs). */
const FIELD_IDS = {
  avatar: "avatar",
  birthDate: "naissance",
  locality: "localite",
  email: "email",
  schoolGrade: "classe",
  gender: "genre",
  goals: "objectifs",
} as const satisfies Partial<Record<keyof ProfileUpdate, string>>;

type FieldName = keyof typeof FIELD_IDS;

type State = {
  attempt: number;
  fields: Partial<Record<FieldName, string>>;
  error?: string;
  saved?: boolean;
};

/** Genre facultatif (D6) : la réponse peut être retirée. */
const GENDER_OPTIONS = [...GENDERS, { value: "", emoji: "🤫", label: "Ne pas dire" }];

function referentialStatus(status: "idle" | "loading" | "error" | "ready") {
  return status === "idle" ? "loading" : status;
}

/**
 * WD17 · Modifier son profil : avatar (palette de l'API), date de naissance (cohérence avec l'âge contrôlée par le
 * serveur, D23), pays, localité, email facultatif, classe, genre facultatif avec sa finalité (D6), objectifs.
 * Un seul `PATCH accounts/me/learner-profile/` ; les erreurs de champ viennent de `fields`.
 */
export function ProfileForm({ profile }: { profile: LearnerProfile }) {
  const router = useRouter();
  const countries = useReferential("countries");
  const grades = useReferential("school-grades");
  const goals = useReferential("goals");
  const avatars = useReferential("avatars");

  const [country, setCountry] = useState(profile.locality?.country ?? "");
  const localities = useReferential("localities", { country });
  const [locality, setLocality] = useState(profile.locality ? String(profile.locality.id) : "");
  const [schoolGrade, setSchoolGrade] = useState(profile.schoolGrade?.code ?? "");
  const [gender, setGender] = useState<string>(profile.gender ?? "");
  const [selectedGoals, setSelectedGoals] = useState(profile.goals.map((goal) => goal.code));
  const [avatar, setAvatar] = useState(profile.avatar?.code);
  const [picking, setPicking] = useState(false);

  const [state, action, pending] = useActionState(
    async (previous: State, form: FormData): Promise<State> => {
      const attempt = previous.attempt + 1;
      const birthDate = String(form.get("birthDate") ?? "");
      const email = String(form.get("email") ?? "").trim();
      const fields: State["fields"] = {};
      if (!birthDate) fields.birthDate = "Indique ta date de naissance.";
      if (!locality) fields.locality = "Choisis ta ville ou ton quartier.";
      if (!schoolGrade) fields.schoolGrade = "Choisis ta classe.";
      if (Object.keys(fields).length > 0) return { attempt, fields };

      const body: ProfileUpdate = {
        birthDate,
        locality: Number(locality),
        email: email || null,
        schoolGrade,
        gender: (gender || null) as Gender | null,
        goals: selectedGoals,
        ...(avatar ? { avatar } : {}),
      };
      const result = await apiCall((api) => api.PATCH("/api/accounts/me/learner-profile/", { body }));
      if (result.ok) {
        // Le shell (avatar, classe, ville) relit `accounts/me/`.
        router.refresh();
        return { attempt, fields: {}, saved: true };
      }
      const entries = Object.entries(result.fields);
      if (entries.length === 0) return { attempt, fields: {}, error: errorMessage(result, "tu") };
      // Erreurs de champ issues de `fields`, sous leur champ ; un champ inconnu du formulaire reste lisible en tête.
      const known = Object.fromEntries(entries.filter(([name]) => name in FIELD_IDS));
      const other = entries.filter(([name]) => !(name in FIELD_IDS)).map(([, message]) => message);
      return { attempt, fields: known, error: other.length > 0 ? other.join(" ") : undefined };
    },
    { attempt: 0, fields: {} },
  );

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
  const current = avatars.items?.find((item) => item.code === avatar);

  return (
    <form onSubmit={submitWith(action)} noValidate className="flex flex-col gap-4">
      <ErrorSummary errors={errors} focusKey={state.attempt} />

      <div className="flex flex-col gap-4 rounded-[18px] border-2 border-ink-100 bg-surface p-4.5">
        <div className="flex flex-wrap items-center gap-4">
          {current ? (
            <Avatar name={current.label} emoji={current.emoji} color={`var(--${current.color})`} size={64} ring decorative />
          ) : (
            <span aria-hidden className="size-16 shrink-0 rounded-pill bg-ink-100" />
          )}
          <div className="min-w-0 flex-1">
            <p className="m-0 text-[15px] font-black text-ink-900">Ton avatar</p>
            <p className="m-0 text-sm font-semibold text-ink-600">{current?.label ?? "Aucun avatar choisi"}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="min-h-11"
            aria-expanded={picking}
            aria-controls={FIELD_IDS.avatar}
            onClick={() => setPicking((open) => !open)}
          >
            {picking ? "Fermer" : "Changer"}
          </Button>
        </div>
        {/* Une erreur sur l'avatar garde la grille ouverte, avec son message. */}
        <div id={FIELD_IDS.avatar} tabIndex={-1} hidden={!picking && !state.fields.avatar} className="outline-none">
          {avatars.status === "error" ? (
            <div className="flex flex-wrap items-center gap-3">
              <p role="alert" className="m-0 font-bold text-error-600">
                Impossible de charger les avatars.
              </p>
              <Button variant="outline" size="sm" className="min-h-11" onClick={avatars.retry}>
                Réessayer
              </Button>
            </div>
          ) : avatars.items ? (
            <AvatarPicker
              legend="Choisis ton avatar"
              name="avatar"
              avatars={avatars.items}
              value={avatar}
              onChange={setAvatar}
              error={state.fields.avatar}
            />
          ) : (
            <Loader label="Chargement des avatars…" />
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-[18px] border-2 border-ink-100 bg-surface p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date de naissance" id={FIELD_IDS.birthDate} required error={state.fields.birthDate}>
            <Input type="date" name="birthDate" autoComplete="bday" defaultValue={profile.birthDate ?? ""} />
          </Field>
          <Field label="Pays" id="pays" required>
            <ReferentialSelect
              items={countries.items}
              status={referentialStatus(countries.status)}
              onRetry={countries.retry}
              value={country}
              onChange={(next) => {
                setCountry(next);
                setLocality("");
              }}
            />
          </Field>
        </div>
        <Field label="Localité (ville / quartier)" id={FIELD_IDS.locality} required error={state.fields.locality}>
          <ReferentialSelect
            items={localityItems}
            status={referentialStatus(localities.status)}
            onRetry={localities.retry}
            value={locality}
            onChange={setLocality}
          />
        </Field>
        <Field
          label="Email"
          id={FIELD_IDS.email}
          hint="Facultatif : pour recevoir tes notifications par email."
          error={state.fields.email}
        >
          <Input
            type="email"
            name="email"
            icon="mail"
            autoComplete="email"
            inputMode="email"
            defaultValue={profile.email ?? ""}
          />
        </Field>
        <Field label="Classe" id={FIELD_IDS.schoolGrade} required error={state.fields.schoolGrade}>
          <ReferentialSelect
            items={grades.items}
            status={referentialStatus(grades.status)}
            onRetry={grades.retry}
            value={schoolGrade}
            onChange={setSchoolGrade}
          />
        </Field>
        <div className="flex flex-col gap-2">
          <ChoiceCardGroup
            legend="Genre (facultatif)"
            name="gender"
            options={GENDER_OPTIONS}
            value={gender}
            onChange={setGender}
            error={state.fields.gender}
          />
          <p className="m-0 flex items-start gap-2.5 rounded-lg bg-info-50 p-3.5 text-sm font-bold text-info-700">
            <span aria-hidden>🔒</span>
            Le genre est facultatif. Il sert seulement à adapter tes parcours et à mesurer, de façon anonyme, si Steamy
            profite à tous. Il n&apos;est jamais vendu ni montré aux autres.
          </p>
        </div>
        <div id={FIELD_IDS.goals} tabIndex={-1} className="outline-none">
          {goals.status === "error" ? (
            <div className="flex flex-wrap items-center gap-3">
              <p role="alert" className="m-0 font-bold text-error-600">
                Impossible de charger les objectifs.
              </p>
              <Button variant="outline" size="sm" className="min-h-11" onClick={goals.retry}>
                Réessayer
              </Button>
            </div>
          ) : goals.items ? (
            <GoalChipGroup
              legend="Objectifs"
              name="goals"
              options={goals.items.map((goal) => ({ value: goal.code, label: goal.label, emoji: goal.emoji }))}
              value={selectedGoals}
              onChange={setSelectedGoals}
              error={state.fields.goals}
            />
          ) : (
            <Loader label="Chargement des objectifs…" />
          )}
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="outline" href={routes.learner.profile}>
          Annuler
        </Button>
        <Button type="submit" loading={pending}>
          Enregistrer
        </Button>
      </div>

      {state.saved && !pending && <SavedToast key={state.attempt} title="Ton profil est enregistré." />}
    </form>
  );
}

/** Confirmation après l'enregistrement, fermable. */
