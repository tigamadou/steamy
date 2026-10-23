"use client";

import type { Schemas } from "@steamy/api-client";
import { useRouter } from "next/navigation";

import { Select } from "@/components/ds";
import { routes } from "@/lib/routes";

import type { ReviewParams } from "./params";

/** Filtre par classe de WT07 : la classe choisie est dans l'URL (`?classe=`), la page revient à la première. */
export function ClassroomFilter({
  classrooms,
  params,
}: {
  classrooms: Pick<Schemas["Classroom"], "id" | "name">[];
  params: ReviewParams;
}) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2.5 text-sm font-bold text-ink-700">
      Classe
      <Select
        value={params.classroomId ?? ""}
        onChange={(event) =>
          router.push(routes.teacher.reviews({ filter: params.filter, classroomId: event.target.value || undefined }))
        }
        className="h-11 min-w-48"
      >
        <option value="">Toutes les classes</option>
        {classrooms.map((classroom) => (
          <option key={classroom.id} value={classroom.id}>
            {classroom.name}
          </option>
        ))}
      </Select>
    </label>
  );
}
