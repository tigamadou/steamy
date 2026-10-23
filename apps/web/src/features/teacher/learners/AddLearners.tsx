import { Breadcrumb, Button, Mascot, SkeletonBlock, Tabs } from "@/components/ds";
import { getClassrooms, getSchool } from "@/features/teacher/classes/api";
import { QuotaNotice } from "@/features/teacher/classes/QuotaNotice";
import { getCountries } from "@/lib/referentials";
import { routes } from "@/lib/routes";

import { BatchImport } from "./BatchImport";
import { IndividualForm } from "./IndividualForm";

type SearchParams = Record<string, string | string[] | undefined>;
type Classroom = { id: number; name: string };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Classe présélectionnée par `?classe=` : seulement une classe de l'enseignant, sinon aucune. */
export function defaultClassroomOf(classrooms: Classroom[], value: string | string[] | undefined): string | undefined {
  const id = first(value);
  return id && classrooms.some((classroom) => String(classroom.id) === id) ? id : undefined;
}

/** Aucune classe : WT06 n'a pas de destination, « Créer une classe » vient d'abord. */
export function NoClassroomForLearners() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[18px] border-2 border-dashed border-primary-300 bg-primary-50 px-5 py-8 text-center">
      <Mascot pose="idle" size={110} />
      <p className="m-0 max-w-120 text-sm font-semibold text-ink-700">
        Créez d&apos;abord une classe : les élèves rejoignent une classe, sur son parcours.
      </p>
      <Button href={routes.teacher.newClassroom} icon="plus">
        Créer une classe
      </Button>
    </div>
  );
}

/** WT06 · ajouter des élèves : onglets Individuel et Import par lot (`?onglet=lot`), classe présélectionnée (`?classe=`). */
export async function AddLearners({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const [classrooms, school, countries] = await Promise.all([getClassrooms(), getSchool(), getCountries()]);
  if (!classrooms || !school) return null;
  const batch = first(params.onglet) === "lot";
  const defaultClassroom = defaultClassroomOf(classrooms, params.classe);
  const hrefOf = (lot: boolean) => routes.teacher.addLearners({ classroomId: defaultClassroom, batch: lot });
  const back = defaultClassroom
    ? [
        { label: "Mes classes", href: routes.teacher.classes },
        {
          label: classrooms.find((classroom) => String(classroom.id) === defaultClassroom)?.name ?? "Classe",
          href: routes.teacher.classroom(defaultClassroom),
        },
        { label: "Ajouter des élèves" },
      ]
    : [{ label: "Mes classes", href: routes.teacher.classes }, { label: "Ajouter des élèves" }];
  return (
    <div className="flex flex-col gap-5">
      <Breadcrumb items={back} />
      {classrooms.length === 0 ? (
        <NoClassroomForLearners />
      ) : (
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_18.75rem]">
          <section
            aria-label="Ajouter des élèves"
            className="flex min-w-0 flex-col gap-4 rounded-[22px] border-2 border-ink-100 bg-surface p-5 sm:p-6"
          >
            <Tabs
              label="Mode d'ajout"
              activeHref={hrefOf(batch)}
              items={[
                { href: hrefOf(false), label: "Individuel" },
                { href: hrefOf(true), label: "Import par lot" },
              ]}
            />
            {batch ? (
              <BatchImport classrooms={classrooms} defaultClassroom={defaultClassroom} offerExpired={school.offerExpired} />
            ) : (
              <IndividualForm
                classrooms={classrooms}
                countries={countries}
                defaultClassroom={defaultClassroom}
                offerExpired={school.offerExpired}
              />
            )}
          </section>
          <QuotaNotice school={school} />
        </div>
      )}
    </div>
  );
}

/** Squelette de WT06 : onglets, formulaire et quota. */
export function AddLearnersSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Chargement du formulaire…" className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_18.75rem]">
      <SkeletonBlock className="h-120 rounded-[22px]" />
      <SkeletonBlock className="h-56 rounded-[20px]" />
    </div>
  );
}
