import { Breadcrumb, Button, Mascot, SkeletonBlock } from "@/components/ds";
import { SavedToast } from "@/features/account/SavedToast";
import { routes } from "@/lib/routes";

import { getClassroom, getMembers, getSchool, type Classroom, type Member } from "./api";
import { InvitationRow, MemberRow } from "./MemberRow";
import { MEMBERS_HEADING_ID } from "./RemoveMemberButton";

const t = routes.teacher;

const CONFIRMATIONS = {
  creee: "La classe est créée.",
  modifiee: "La classe est enregistrée.",
  invitation: "La demande est envoyée au parent. L'élève rejoindra la classe après son accord.",
} as const;

/** WT04 vide : « Ajoutez vos premiers élèves » → WT06 sur cette classe. */
export function EmptyClassroom({ classroom, blocked }: { classroom: Classroom; blocked: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[18px] border-2 border-dashed border-primary-300 bg-primary-50 px-5 py-8 text-center">
      <Mascot pose="wave" size={120} />
      <h3 className="m-0 text-lg font-black text-ink-900">Ajoutez vos premiers élèves</h3>
      <p className="m-0 max-w-120 text-sm font-semibold text-ink-700">
        Un par un ou par import d&apos;un fichier. Chaque parent reçoit une demande de consentement par SMS ; l&apos;élève
        rejoint la classe après son accord.
      </p>
      {blocked ? (
        <Button disabled icon="plus">
          Ajouter des élèves
        </Button>
      ) : (
        <Button href={t.addLearners({ classroomId: classroom.id })} icon="plus">
          Ajouter des élèves
        </Button>
      )}
    </div>
  );
}

/** WT04 · contenu : fil, actions, élèves actifs puis invitations. */
export function ClassroomMembersView({
  classroom,
  members,
  blocked,
  confirmation,
}: {
  classroom: Classroom;
  members: Member[];
  /** Offre échue : l'ajout d'élèves est bloqué (C21) ; le suivi reste ouvert. */
  blocked: boolean;
  confirmation?: keyof typeof CONFIRMATIONS;
}) {
  const active = members.filter((member) => member.status === "active");
  const invitations = members.filter((member) => member.status === "invited");
  return (
    <div className="flex flex-col gap-5">
      {confirmation && <SavedToast title={CONFIRMATIONS[confirmation]} clearParam="confirmation" />}
      <Breadcrumb items={[{ label: "Mes classes", href: t.classes }, { label: classroom.name }]} />
      <header className="flex flex-wrap items-center gap-4 rounded-[22px] border-2 border-ink-100 bg-surface p-5">
        <span
          aria-hidden
          className="flex size-14 shrink-0 items-center justify-center rounded-[18px] text-2xl"
          style={{ backgroundColor: classroom.color }}
        >
          {classroom.course.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="m-0 text-xl leading-tight font-black text-ink-900">{classroom.name}</h2>
          <p className="m-0 mt-1 text-[13px] font-bold text-ink-700">
            {classroom.course.title}
            {classroom.schoolGrade && ` · ${classroom.schoolGrade.label}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button href={t.editClassroom(classroom.id)} variant="outline">
            Modifier
          </Button>
          {!blocked && (
            <Button href={t.addLearners({ classroomId: classroom.id })} icon="plus">
              Ajouter des élèves
            </Button>
          )}
        </div>
      </header>
      {active.length + invitations.length === 0 ? (
        <EmptyClassroom classroom={classroom} blocked={blocked} />
      ) : (
        <>
          <section aria-labelledby={MEMBERS_HEADING_ID} className="flex flex-col gap-2">
            <h3
              id={MEMBERS_HEADING_ID}
              tabIndex={-1}
              className="m-0 text-lg font-black tracking-[-0.01em] text-ink-900 outline-none"
            >
              Élèves ({active.length})
            </h3>
            {active.length === 0 ? (
              <p className="m-0 text-sm font-semibold text-ink-600">
                Aucun élève actif : les élèves apparaissent ici dès que leur parent a accepté l&apos;invitation.
              </p>
            ) : (
              <ul aria-label="Élèves de la classe" className="m-0 flex list-none flex-col gap-2 p-0">
                {active.map((member) => (
                  <li key={member.id}>
                    <MemberRow member={member} classroomId={classroom.id} />
                  </li>
                ))}
              </ul>
            )}
          </section>
          {invitations.length > 0 && (
            <section aria-labelledby="invitations-classe" className="flex flex-col gap-2">
              <h3 id="invitations-classe" className="m-0 text-lg font-black tracking-[-0.01em] text-ink-900">
                Invitations ({invitations.length})
              </h3>
              <ul aria-label="Invitations" className="m-0 flex list-none flex-col gap-2 p-0">
                {invitations.map((member) => (
                  <li key={member.id}>
                    <InvitationRow member={member} classroomId={classroom.id} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function confirmationOf(value: string | string[] | undefined): keyof typeof CONFIRMATIONS | undefined {
  return typeof value === "string" && Object.hasOwn(CONFIRMATIONS, value) ? (value as keyof typeof CONFIRMATIONS) : undefined;
}

/** WT04 · élèves d'une classe, lus côté serveur ; une classe d'un autre enseignant est introuvable (404). */
export async function ClassroomMembers({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const { confirmation } = await searchParams;
  const [classroom, members, school] = await Promise.all([getClassroom(id), getMembers(id), getSchool()]);
  return (
    classroom &&
    members &&
    school && (
      <ClassroomMembersView
        classroom={classroom}
        members={members}
        blocked={school.offerExpired}
        confirmation={confirmationOf(confirmation)}
      />
    )
  );
}

/** Squelette de WT04 : fil, en-tête et lignes. */
export function ClassroomMembersSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Chargement de la classe…" className="flex flex-col gap-5">
      <SkeletonBlock className="h-5 w-48 rounded-sm" />
      <SkeletonBlock className="h-24 rounded-[22px]" />
      <SkeletonBlock className="h-18 rounded-[14px]" />
      <SkeletonBlock className="h-18 rounded-[14px]" />
    </div>
  );
}
