"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

import { Button, ErrorSummary, Field, Input } from "@/components/ds";
import { EditableCard } from "@/features/account/EditableCard";
import { SavedToast } from "@/features/account/SavedToast";
import { apiCall, errorMessage } from "@/lib/api-call";
import { submitWith } from "@/lib/form";

export type TeacherIdentity = {
  firstName: string;
  lastName: string;
  /** Spécialité (facultative), modifiable. */
  specialty: string;
  /** Nom de l'établissement de rattachement, en lecture seule (C6). */
  school: string | null;
};

type FieldName = "firstName" | "lastName" | "specialty";
type State = { attempt: number; fields: Partial<Record<FieldName, string>>; error?: string; saved: number };

const IDS: Record<FieldName, string> = {
  firstName: "profil-prenom",
  lastName: "profil-nom",
  specialty: "profil-specialite",
};

/**
 * Profil de WT08 : nom (`PATCH accounts/me/`) et spécialité (`PATCH accounts/me/teacher-profile/`) modifiables ; l'établissement est celui de l'invitation, il ne se change
 * pas ici. Aucune « Bio » : un enseignant n'a pas de profil public (S5).
 */
export function TeacherProfileCard({ identity }: { identity: TeacherIdentity }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(
    async (previous: State, form: FormData): Promise<State> => {
      const attempt = previous.attempt + 1;
      const saved = previous.saved;
      const firstName = String(form.get("firstName") ?? "").trim();
      const lastName = String(form.get("lastName") ?? "").trim();
      const specialty = String(form.get("specialty") ?? "").trim();
      const fields: State["fields"] = {};
      if (!firstName) fields.firstName = "Indiquez votre prénom.";
      if (!lastName) fields.lastName = "Indiquez votre nom.";
      if (fields.firstName || fields.lastName) return { attempt, saved, fields };

      const me = await apiCall((api) => api.PATCH("/api/accounts/me/", { body: { firstName, lastName } }));
      const result = me.ok
        ? await apiCall((api) => api.PATCH("/api/accounts/me/teacher-profile/", { body: { specialty } }))
        : me;
      if (result.ok) {
        setEditing(false);
        router.refresh();
        return { attempt, saved: saved + 1, fields: {} };
      }
      // Nom enregistré, spécialité refusée : le nom affiché est relu
      if (me.ok) router.refresh();
      const apiFields = Object.fromEntries(
        Object.entries(result.fields).filter(([name]) => name in IDS),
      ) as State["fields"];
      if (Object.keys(apiFields).length > 0) return { attempt, saved, fields: apiFields };
      return { attempt, saved, fields: {}, error: errorMessage(result, "vous") };
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
          { label: "Spécialité", value: identity.specialty },
          { label: "Établissement", value: identity.school },
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
          <Field label="Spécialité" id={IDS.specialty} hint="Facultatif." error={state.fields.specialty}>
            <Input name="specialty" defaultValue={identity.specialty} maxLength={120} autoComplete="organization-title" />
          </Field>
          <p className="m-0 text-[13px] font-semibold text-ink-600">
            Votre établissement ({identity.school ?? "non renseigné"}) est celui de votre invitation : il ne se modifie pas
            ici.
          </p>
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
