"use client";

import type { Schemas } from "@steamy/api-client";

import { Field, Select } from "@/components/ds";

/** Classe* de WT06, présélectionnée par `?classe=` : seules les classes de l'enseignant sont proposées. */
export function ClassroomField({
  classrooms,
  defaultValue,
  error,
  id,
}: {
  classrooms: Pick<Schemas["Classroom"], "id" | "name">[];
  defaultValue?: string;
  error?: string;
  id: string;
}) {
  return (
    <Field label="Classe" id={id} required error={error}>
      <Select name="classroomId" defaultValue={defaultValue ?? ""}>
        <option value="">Choisissez une classe</option>
        {classrooms.map((classroom) => (
          <option key={classroom.id} value={classroom.id}>
            {classroom.name}
          </option>
        ))}
      </Select>
    </Field>
  );
}
