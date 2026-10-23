"use client";

import type { Schemas } from "@steamy/api-client";
import { useRouter } from "next/navigation";
import { useActionState, useRef } from "react";

import { Button, ChoiceGroup, ErrorSummary, Field, Icon, Input, ReferentialSelect } from "@/components/ds";
import { apiCall, errorMessage } from "@/lib/api-call";
import { submitWith } from "@/lib/form";
import { routes } from "@/lib/routes";
import { useReferential } from "@/lib/use-referential";

import { creationBlocked, QuotaNotice } from "./QuotaNotice";

type School = Schemas["School"];
type Classroom = Schemas["Classroom"];
type Field_ = "name" | "course";
type State = { attempt: number; fields: Partial<Record<Field_, string>>; error?: string };

const IDS: Record<Field_, string> = { name: "classe-nom", course: "classe-parcours" };

/**
 * WT13 · créer (`POST classrooms/`) ou modifier (`PATCH classrooms/{id}/`) une classe : nom*, parcours* limité à
 * l'offre de l'école, niveau scolaire facultatif, établissement en lecture seule. En édition, le parcours est figé dès
 * qu'un élève a rejoint la classe. Le quota n'est qu'une indication : le serveur décide, et son erreur reste affichée.
 */
export function ClassroomForm({ school, classroom }: { school: School; classroom?: Classroom }) {
  const router = useRouter();
  const grades = useReferential("school-grades");
  const edit = classroom !== undefined;
  const locked = edit && classroom.hasMembers;
  const blocked = !edit && creationBlocked(school);
  const inFlight = useRef(false);

  const [state, action, pending] = useActionState(
    async (previous: State, form: FormData): Promise<State> => {
      const attempt = previous.attempt + 1;
      // Verrou « en vol » : une seconde soumission avant la réponse ne repart pas
      if (inFlight.current) return { ...previous, attempt };
      const name = String(form.get("name") ?? "").trim();
      const courseSlug = String(form.get("courseSlug") ?? "");
      const schoolGrade = String(form.get("schoolGrade") ?? "") || null;
      const fields: State["fields"] = {};
      if (!name) fields.name = "Indiquez le nom de la classe.";
      if (!locked && !courseSlug) fields.course = "Choisissez un parcours.";
      if (fields.name || fields.course) return { attempt, fields };

      inFlight.current = true;
      const result = await apiCall((api) =>
        edit
          ? api.PATCH("/api/classrooms/{id}/", {
              params: { path: { id: String(classroom.id) } },
              body: locked ? { name, schoolGrade } : { name, courseSlug, schoolGrade },
            })
          : api.POST("/api/classrooms/", { body: { name, courseSlug, schoolGrade } }),
      );
      inFlight.current = false;
      if (result.ok) {
        const id = result.data.id;
        router.push(routes.teacher.classroom(id, edit ? "modifiee" : "creee"));
        return { attempt, fields: {} };
      }
      if (result.code === "CLASSROOM_NAME_TAKEN") {
        return { attempt, fields: { name: "Une classe porte déjà ce nom dans votre établissement." } };
      }
      if (result.code === "COURSE_NOT_IN_OFFER") {
        return {
          attempt,
          fields: { course: "Ce parcours ne fait plus partie de l'offre de l'école. Choisissez-en un autre." },
        };
      }
      if (result.code === "CLASSROOM_QUOTA_EXCEEDED") {
        return {
          attempt,
          fields: {},
          error: "Le quota de classes de l'offre est atteint : impossible de créer une nouvelle classe.",
        };
      }
      if (result.code === "SCHOOL_OFFER_EXPIRED") {
        return {
          attempt,
          fields: {},
          error: "L'offre de votre établissement est échue : la création de classes est bloquée.",
        };
      }
      const apiFields: State["fields"] = {};
      if (result.fields.name) apiFields.name = result.fields.name;
      if (result.fields.courseSlug) apiFields.course = result.fields.courseSlug;
      if (Object.keys(apiFields).length > 0) return { attempt, fields: apiFields };
      return { attempt, fields: {}, error: errorMessage(result, "vous") };
    },
    { attempt: 0, fields: {} },
  );

  const errors = [
    ...(Object.entries(state.fields) as [Field_, string][]).map(([field, message]) => ({ field: IDS[field], message })),
    ...(state.error ? [{ message: state.error }] : []),
  ];
  const lockedCourse = school.courses.find((course) => course.slug === classroom?.course.slug) ?? classroom?.course;

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_18.75rem]">
      <form
        onSubmit={submitWith(action)}
        noValidate
        aria-label={edit ? "Modifier la classe" : "Créer une classe"}
        className="flex flex-col gap-4 rounded-[22px] border-2 border-ink-100 bg-surface p-5 sm:p-6"
      >
        {blocked && (
          <p className="m-0 rounded-[14px] border-2 border-error-100 bg-error-50 px-3.5 py-3 text-[13px] font-extrabold text-error-700">
            ⛔{" "}
            {school.offerExpired
              ? "L'offre de votre établissement est échue : impossible de créer une nouvelle classe."
              : `Quota de classes atteint (${school.classroomsUsed} sur ${school.classroomQuota}) : impossible de créer une nouvelle classe pour le moment.`}
          </p>
        )}
        <ErrorSummary title="Corrigez les erreurs suivantes :" errors={errors} focusKey={state.attempt} />
        <Field
          label="Nom de la classe"
          id={IDS.name}
          required
          hint={edit ? undefined : "Par exemple « 4ᵉ B · Robotique ». Unique dans l'établissement."}
          error={state.fields.name}
        >
          <Input name="name" defaultValue={classroom?.name ?? ""} maxLength={120} autoComplete="off" />
        </Field>

        {locked && lockedCourse ? (
          <div className="flex flex-col gap-2">
            <p className="m-0 text-sm font-bold text-ink-700">Parcours</p>
            <p className="m-0 flex items-center gap-3 rounded-2xl border-2 border-ink-200 bg-ink-50 p-3 text-sm font-black text-ink-900">
              <span aria-hidden>{lockedCourse.emoji}</span>
              {lockedCourse.title}
              <Icon name="lock" size={16} className="ml-auto text-ink-600" />
            </p>
            <p className="m-0 text-[13px] font-bold text-ink-600">
              {classroom.memberCount} élève{classroom.memberCount > 1 ? "s sont inscrits" : " est inscrit"} : le parcours
              n&apos;est plus modifiable.
            </p>
          </div>
        ) : (
          <div id={IDS.course}>
            <ChoiceGroup
              legend="Parcours"
              name="courseSlug"
              required
              options={school.courses.map((course) => ({ value: course.slug, course }))}
              defaultValue={classroom?.course.slug}
              error={state.fields.course}
              withDescription
              listClassName="flex flex-col gap-2.5"
              optionClassName={(_, checked) =>
                `flex items-center gap-3 rounded-2xl border-2 p-3 ${
                  checked
                    ? "border-primary-500 bg-primary-50 shadow-[0_4px_0_var(--primary-300)]"
                    : "border-ink-200 bg-surface shadow-[0_4px_0_var(--ink-200)] hover:bg-ink-50"
                }`
              }
              renderOption={({ course }, { labelId, descriptionId }) => (
                <>
                  <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-xl">
                    {course.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span id={labelId} className="block text-sm font-black text-ink-900">
                      {course.title}
                    </span>
                    <span id={descriptionId} className="block text-xs font-bold text-ink-600">
                      {course.category.label} · {course.durationHours} h
                    </span>
                  </span>
                </>
              )}
            />
            <p className="m-0 mt-2 text-[13px] font-bold text-ink-600">
              Une classe suit un seul parcours. Seuls les parcours inclus dans l&apos;offre de votre école sont proposés.
            </p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-[11.25rem_minmax(0,1fr)]">
          <Field label="Niveau scolaire" id="classe-niveau" hint="Facultatif">
            <ReferentialSelect
              name="schoolGrade"
              defaultValue={classroom?.schoolGrade?.code ?? ""}
              items={grades.items}
              status={grades.status === "idle" ? "loading" : grades.status}
              onRetry={grades.retry}
              placeholder="—"
            />
          </Field>
          <Field label="Établissement" id="classe-etablissement">
            <Input value={`${school.name} · ${school.city}`} readOnly aria-readonly className="bg-ink-50 text-ink-600" />
          </Field>
        </div>

        <div className="flex flex-wrap justify-end gap-2.5 pt-1">
          <Button href={edit ? routes.teacher.classroom(classroom.id) : routes.teacher.classes} variant="outline">
            Annuler
          </Button>
          <Button type="submit" loading={pending} disabled={blocked} icon={edit ? undefined : "plus"}>
            {edit ? "Enregistrer" : "Créer la classe"}
          </Button>
        </div>
      </form>
      <QuotaNotice school={school} />
    </div>
  );
}
