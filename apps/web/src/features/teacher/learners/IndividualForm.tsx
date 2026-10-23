"use client";

import type { Schemas } from "@steamy/api-client";
import { useRouter } from "next/navigation";
import { useActionState, useRef } from "react";

import { Button, ErrorSummary, Field, Input, PhoneInput, ReferentialSelect, type PhoneCountry } from "@/components/ds";
import { apiCall, errorMessage } from "@/lib/api-call";
import { submitWith } from "@/lib/form";
import { routes } from "@/lib/routes";
import { useReferential } from "@/lib/use-referential";

import { ClassroomField } from "./ClassroomField";

type FieldName = "firstName" | "lastName" | "parentPhone" | "relationship" | "classroomId";
type State = { attempt: number; fields: Partial<Record<FieldName, string>>; error?: string };

const IDS: Record<FieldName, string> = {
  firstName: "eleve-prenom",
  lastName: "eleve-nom",
  parentPhone: "eleve-telephone-parent",
  relationship: "eleve-parente",
  classroomId: "eleve-classe",
};

/**
 * WT06 · onglet Individuel (D60) : prénom*, nom*, téléphone du parent*, lien de parenté*, classe*. Le parent reçoit une
 * demande de consentement par SMS ; l'élève rejoint la classe après son accord. Aucun téléphone de l'élève. Le front ne
 * valide que la forme : doublon, quota, délai après un refus et appartenance sont décidés par le serveur, dont le
 * message est affiché.
 */
export function IndividualForm({
  classrooms,
  countries,
  defaultClassroom,
}: {
  classrooms: Pick<Schemas["Classroom"], "id" | "name">[];
  countries: PhoneCountry[];
  defaultClassroom?: string;
}) {
  const router = useRouter();
  const relationships = useReferential("relationships");
  const inFlight = useRef(false);
  const [state, action, pending] = useActionState(
    async (previous: State, form: FormData): Promise<State> => {
      const attempt = previous.attempt + 1;
      // Verrou « en vol » : une seconde soumission avant la réponse ne repart pas
      if (inFlight.current) return { ...previous, attempt };
      const value = (name: FieldName) => String(form.get(name) ?? "").trim();
      const [firstName, lastName, parentPhone, relationship, classroomId] = (
        ["firstName", "lastName", "parentPhone", "relationship", "classroomId"] as const
      ).map(value);
      const fields: State["fields"] = {};
      if (!firstName) fields.firstName = "Indiquez le prénom de l'élève.";
      if (!lastName) fields.lastName = "Indiquez le nom de l'élève.";
      if (!parentPhone) fields.parentPhone = "Saisissez un numéro valide pour ce pays.";
      if (!relationship) fields.relationship = "Choisissez le lien de parenté.";
      if (!classroomId) fields.classroomId = "Choisissez une classe.";
      if (Object.keys(fields).length > 0) return { attempt, fields };

      inFlight.current = true;
      const result = await apiCall((api) =>
        api.POST("/api/classrooms/{id}/invitations/", {
          params: { path: { id: classroomId } },
          body: { firstName, lastName, parentPhone, relationship },
        }),
      );
      inFlight.current = false;
      if (result.ok) {
        router.push(routes.teacher.classroom(classroomId, "invitation"));
        return { attempt, fields: {} };
      }
      if (result.code === "PHONE_INVALID") {
        return { attempt, fields: { parentPhone: "Ce numéro n'est pas valide : vérifiez-le." } };
      }
      const apiFields: State["fields"] = {};
      for (const name of ["firstName", "lastName", "parentPhone", "relationship"] as const) {
        if (result.fields[name]) apiFields[name] = result.fields[name];
      }
      if (Object.keys(apiFields).length > 0) return { attempt, fields: apiFields };
      // Doublon, quota, délai après un refus, offre échue… : le message du serveur, au vouvoiement
      return { attempt, fields: {}, error: errorMessage(result, "vous") };
    },
    { attempt: 0, fields: {} },
  );

  const errors = [
    ...(Object.entries(state.fields) as [FieldName, string][]).map(([name, message]) => ({ field: IDS[name], message })),
    ...(state.error ? [{ message: state.error }] : []),
  ];

  return (
    <form onSubmit={submitWith(action)} noValidate aria-label="Ajouter un élève" className="flex flex-col gap-4">
      <ErrorSummary title="Corrigez les erreurs suivantes :" errors={errors} focusKey={state.attempt} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prénom" id={IDS.firstName} required error={state.fields.firstName}>
          <Input name="firstName" autoComplete="off" maxLength={150} />
        </Field>
        <Field label="Nom" id={IDS.lastName} required error={state.fields.lastName}>
          <Input name="lastName" autoComplete="off" maxLength={150} />
        </Field>
      </div>
      <Field label="Téléphone du parent" id={IDS.parentPhone} required error={state.fields.parentPhone}>
        <PhoneInput name="parentPhone" countries={countries} countryLabel="Pays du téléphone du parent" />
      </Field>
      <Field label="Lien de parenté" id={IDS.relationship} required error={state.fields.relationship}>
        <ReferentialSelect
          name="relationship"
          items={relationships.items}
          status={relationships.status === "idle" ? "loading" : relationships.status}
          onRetry={relationships.retry}
          placeholder="Choisissez le lien"
        />
      </Field>
      <ClassroomField
        id={IDS.classroomId}
        classrooms={classrooms}
        defaultValue={defaultClassroom}
        error={state.fields.classroomId}
      />
      <p className="m-0 flex items-start gap-2.5 rounded-lg bg-info-50 p-3.5 text-sm font-bold text-info-700">
        <span aria-hidden>📩</span>
        Le parent reçoit une demande de consentement par SMS. L&apos;élève rejoint la classe après son accord.
      </p>
      <div className="flex justify-end">
        <Button type="submit" loading={pending} icon="arrow-right">
          Envoyer la demande
        </Button>
      </div>
    </form>
  );
}
