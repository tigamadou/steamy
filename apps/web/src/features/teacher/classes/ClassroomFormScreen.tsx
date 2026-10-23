import { Breadcrumb, SkeletonBlock } from "@/components/ds";
import { routes } from "@/lib/routes";

import { getClassroom, getSchool } from "./api";
import { ClassroomForm } from "./ClassroomForm";

/** WT13 · créer une classe : l'école, ses quotas et les parcours de l'offre sont lus côté serveur. */
export async function NewClassroom() {
  const school = await getSchool();
  return (
    school && (
      <div className="flex flex-col gap-5">
        <Breadcrumb items={[{ label: "Mes classes", href: routes.teacher.classes }, { label: "Créer une classe" }]} />
        <ClassroomForm school={school} />
      </div>
    )
  );
}

/** WT13 · modifier une classe (renommer ; parcours figé dès qu'un élève a rejoint) ; 404 hors de ses classes. */
export async function EditClassroom({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [classroom, school] = await Promise.all([getClassroom(id), getSchool()]);
  return (
    classroom &&
    school && (
      <div className="flex flex-col gap-5">
        <Breadcrumb
          items={[
            { label: "Mes classes", href: routes.teacher.classes },
            { label: classroom.name, href: routes.teacher.classroom(classroom.id) },
            { label: "Modifier" },
          ]}
        />
        <ClassroomForm school={school} classroom={classroom} />
      </div>
    )
  );
}

/** Squelette de WT13 : formulaire et quota. */
export function ClassroomFormSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Chargement du formulaire…" className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_18.75rem]">
      <SkeletonBlock className="h-96 rounded-[22px]" />
      <SkeletonBlock className="h-56 rounded-[20px]" />
    </div>
  );
}
