"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

import { Button, ErrorSummary, Field, Input } from "@/components/ds";
import { EditableCard } from "@/features/account/EditableCard";
import { SavedToast } from "@/features/account/SavedToast";
import { apiCall, errorMessage } from "@/lib/api-call";
import { submitWith } from "@/lib/form";


export type ParentIdentity = {
  firstName: string;
  lastName: string;
  phone: string | null;
  /** Email de contact (rapport hebdomadaire, D55), facultatif. */
  email: string | null;
  profession: string;
};

type FieldName = "firstName" | "lastName" | "email" | "profession";
type State = { attempt: number; fields: Partial<Record<FieldName, string>>; error?: string; saved: number };

const IDS: Record<FieldName, string> = {
  firstName: "profil-prenom",
  lastName: "profil-nom",
  email: "profil-email",
  profession: "profil-profession",
};

/**
 * Profil de WPD08 : nom, téléphone (lecture, il se change dans « Connexion »), email facultatif qui reçoit le rapport
 * hebdomadaire (D55) et profession. `PATCH accounts/me/` puis `PATCH accounts/me/parent-profile/`.
 */
export function ProfileCard({ identity }: { identity: ParentIdentity }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(
    async (previous: State, form: FormData): Promise<State> => {
      const attempt = previous.attempt + 1;
      const saved = previous.saved;
      const value = (name: FieldName) => String(form.get(name) ?? "").trim();
      const [firstName, lastName, email, profession] = (["firstName", "lastName", "email", "profession"] as const).map(value);
      const fields: State["fields"] = {};
      if (!firstName) fields.firstName = "Indiquez votre prénom.";
      if (!lastName) fields.lastName = "Indiquez votre nom.";
      if (fields.firstName || fields.lastName) return { attempt, saved, fields };

      const me = await apiCall((api) => api.PATCH("/api/accounts/me/", { body: { firstName, lastName } }));
      const result = me.ok
        ? await apiCall((api) =>
            api.PATCH("/api/accounts/me/parent-profile/", { body: { email: email || null, profession } }),
          )
        : me;
      if (result.ok) {
        setEditing(false);
        router.refresh();
        return { attempt, saved: saved + 1, fields: {} };
      }
      // Nom enregistré, email ou profession refusés : le nom affiché est relu, l'erreur dit ce qui manque
      if (me.ok) router.refresh();
      const apiFields = Object.fromEntries(
        Object.entries(result.fields).filter(([name]) => name in IDS),
      ) as State["fields"];
      if (Object.keys(apiFields).length > 0) return { attempt, saved, fields: apiFields };
      const error = errorMessage(result, "vous");
      return {
        attempt,
        saved,
        fields: {},
        error: me.ok ? `Votre nom est enregistré, mais pas l'email ni la profession. ${error}` : error,
      };
    },
    { attempt: 0, saved: 0, fields: {} },
  );

  const errors = [
    ...(Object.entries(state.fields) as [FieldName, string][]).map(([name, message]) => ({ field: IDS[name], message })),
    ...(state.error ? [{ message: state.error }] : []),
  ];

  return (
    <>
      <EditableCard
        title="Mes informations"
        editing={editing}
        onEdit={() => setEditing(true)}
        rows={[
          { label: "Nom", value: `${identity.firstName} ${identity.lastName}`.trim() },
          { label: "Téléphone", value: identity.phone },
          { label: "Email", value: identity.email },
          { label: "Profession", value: identity.profession },
        ]}
      >
        <form onSubmit={submitWith(action)} noValidate aria-label="Mes informations" className="flex flex-col gap-4">
          <ErrorSummary title="Corrigez les erreurs suivantes :" errors={errors} focusKey={state.attempt} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Prénom" id={IDS.firstName} required error={state.fields.firstName}>
              <Input name="firstName" defaultValue={identity.firstName} autoComplete="given-name" />
            </Field>
            <Field label="Nom" id={IDS.lastName} required error={state.fields.lastName}>
              <Input name="lastName" defaultValue={identity.lastName} autoComplete="family-name" />
            </Field>
          </div>
          <Field
            label="Email"
            id={IDS.email}
            hint="Facultatif. Le rapport hebdomadaire de vos enfants y est envoyé chaque semaine."
            error={state.fields.email}
          >
            <Input name="email" type="email" defaultValue={identity.email ?? ""} autoComplete="email" />
          </Field>
          <Field label="Profession" id={IDS.profession} hint="Facultatif." error={state.fields.profession}>
            <Input name="profession" defaultValue={identity.profession} autoComplete="organization-title" />
          </Field>
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Annuler
            </Button>
            <Button type="submit" loading={pending}>
              Enregistrer
            </Button>
          </div>
        </form>
      </EditableCard>
      {state.saved > 0 && <SavedToast key={state.saved} title="Vos informations sont enregistrées." />}
    </>
  );
}
