import { Button, Mascot, SkeletonBlock } from "@/components/ds";
import { ClassCard } from "@/features/teacher/home/ClassCard";
import { routes } from "@/lib/routes";

import { getClassrooms, getSchool, type Classroom, type School } from "./api";
import { creationBlocked, QuotaNotice } from "./QuotaNotice";

const t = routes.teacher;

/** Aucune classe : Zeti et « Créer une classe » (désactivé si le quota l'interdit). */
export function NoClassroomYet({ blocked }: { blocked: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[18px] border-2 border-dashed border-primary-300 bg-primary-50 px-5 py-8 text-center">
      <Mascot pose="idle" size={110} />
      <p className="m-0 max-w-120 text-sm font-semibold text-ink-700">
        Vous n&apos;avez pas encore de classe. Créez-en une pour inviter vos élèves sur un parcours de l&apos;offre de
        votre établissement.
      </p>
      {blocked ? (
        <Button disabled icon="plus">
          Créer une classe
        </Button>
      ) : (
        <Button href={t.newClassroom} icon="plus">
          Créer une classe
        </Button>
      )}
    </div>
  );
}

/** WT03 · contenu : « Créer une classe », quota de l'école, cartes des classes. */
export function TeacherClassesView({ classrooms, school }: { classrooms: Classroom[]; school: School }) {
  const blocked = creationBlocked(school);
  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_18.75rem]">
      <section aria-labelledby="mes-classes-liste" className="flex min-w-0 flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 id="mes-classes-liste" className="m-0 text-lg font-black tracking-[-0.01em] text-ink-900">
            {classrooms.length === 0 ? "Aucune classe" : `${classrooms.length} classe${classrooms.length > 1 ? "s" : ""}`}
          </h2>
          {classrooms.length > 0 &&
            (blocked ? (
              <Button disabled icon="plus" aria-describedby="quota-bloque">
                Créer une classe
              </Button>
            ) : (
              <Button href={t.newClassroom} icon="plus">
                Créer une classe
              </Button>
            ))}
        </div>
        {blocked && classrooms.length > 0 && (
          <p id="quota-bloque" className="m-0 text-[13px] font-bold text-error-700">
            {school.offerExpired
              ? "L'offre de votre établissement est échue : la création de classes est bloquée."
              : "Le quota de classes de l'offre est atteint : vous ne pouvez plus créer de classe."}
          </p>
        )}
        {classrooms.length === 0 ? (
          <NoClassroomYet blocked={blocked} />
        ) : (
          <ul aria-label="Mes classes" className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2">
            {classrooms.map((classroom) => (
              <li key={classroom.id}>
                <ClassCard classroom={classroom} />
              </li>
            ))}
          </ul>
        )}
      </section>
      <QuotaNotice school={school} />
    </div>
  );
}

/** WT03 · mes classes, lues côté serveur avec l'école et ses quotas. */
export async function TeacherClasses() {
  const [classrooms, school] = await Promise.all([getClassrooms(), getSchool()]);
  return classrooms && school && <TeacherClassesView classrooms={classrooms} school={school} />;
}

/** Squelette de WT03 : cartes et quota. */
export function TeacherClassesSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Chargement de vos classes…" className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_18.75rem]">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SkeletonBlock className="h-32 rounded-[18px]" />
        <SkeletonBlock className="h-32 rounded-[18px]" />
      </div>
      <SkeletonBlock className="h-56 rounded-[20px]" />
    </div>
  );
}
