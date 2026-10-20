import type { Schemas } from "@steamy/api-client";
import Link from "next/link";

import { Avatar, Badge, Breadcrumb, Button, InfoCard, ProgressBar, QuizAttemptRow, SkeletonBlock } from "@/components/ds";
import { localityLabel } from "@/features/account/locality";
import { SavedToast } from "@/features/account/SavedToast";
import { quizStep } from "@/features/learning/tree";
import { childMeta } from "@/features/parent/home/ChildCard";
import { formatDate, formatInstant } from "@/lib/dates";
import { routes, type ChildConfirmation } from "@/lib/routes";

import { getChild, getTeacherComments, type ChildDetail as Child } from "./api";
import { fullName } from "./ChildRow";
import { ResetChildPasswordDialog } from "./ResetChildPasswordDialog";

const p = routes.parent;

/** Progression par parcours (WPD03), l'activité la plus récente d'abord (ordre de l'API) ; pourcentages serveur. */
export function CourseProgressList({ courses }: { courses: Child["courses"] }) {
  return (
    <section aria-labelledby="progression">
      <h2 id="progression" className="m-0 mb-2 text-lg font-black tracking-[-0.01em] text-ink-900">
        Progression des parcours
      </h2>
      {courses.length === 0 ? (
        <p className="m-0 rounded-[18px] border-[1.5px] border-dashed border-ink-200 bg-surface px-4.5 py-4 text-sm font-semibold text-ink-600">
          Aucun parcours commencé pour l&apos;instant.
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {courses.map((enrollment) => {
            const { course } = enrollment;
            const done = enrollment.status === "completed";
            return (
              <li
                key={enrollment.id}
                className="flex items-center gap-3.5 rounded-2xl border-[1.5px] border-ink-100 bg-surface p-3.5"
              >
                <span
                  aria-hidden
                  className="flex size-11 shrink-0 items-center justify-center rounded-md text-[22px]"
                  style={{ background: course.category.color }}
                >
                  {course.emoji || course.category.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-extrabold text-ink-900">{course.title}</span>
                    {done && <Badge tone="success">Terminé</Badge>}
                  </div>
                  <ProgressBar
                    value={enrollment.progressPct}
                    label={`Progression : ${course.title}`}
                    tone={done ? "success" : "primary"}
                  />
                  <p className="m-0 mt-1 text-xs font-bold text-ink-600">
                    {enrollment.missionsDone}/{enrollment.missionCount} missions terminées
                  </p>
                </div>
                <span
                  aria-hidden
                  className={`min-w-11 text-right text-sm font-black ${done ? "text-success-700" : "text-primary-600"}`}
                >
                  {enrollment.progressPct} %
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Dernières tentatives de quiz (WPD03), statut serveur `ok`/`warn`/`ko` (D31), en lecture seule pour le parent. */
export function AttemptList({ attempts, courses }: { attempts: Child["recentAttempts"]; courses: Child["courses"] }) {
  const titles = new Map(courses.map(({ course }) => [course.slug, course.title]));
  return (
    <section aria-labelledby="tentatives">
      <h2 id="tentatives" className="m-0 mb-2 text-lg font-black tracking-[-0.01em] text-ink-900">
        Dernières tentatives de quiz
      </h2>
      {attempts.length === 0 ? (
        <p className="m-0 rounded-[18px] border-[1.5px] border-dashed border-ink-200 bg-surface px-4.5 py-4 text-sm font-semibold text-ink-600">
          Aucun quiz passé pour l&apos;instant.
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {attempts.map((attempt) => (
            <li key={attempt.id}>
              <QuizAttemptRow
                title={attempt.quiz.title}
                subtitle={[titles.get(attempt.quiz.courseSlug), quizStep(attempt.quiz.kind), formatInstant(attempt.createdAt)]
                  .filter(Boolean)
                  .join(" · ")}
                emoji={attempt.quiz.kind === "summative" ? "🏁" : "📝"}
                status={attempt.status}
                score={attempt.score}
                total={attempt.total}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Commentaires des enseignants (D63), en lecture seule, lus dans `classrooms/comments/?learnerId=` (API-L5). */
export function TeacherComments({ comments }: { comments: Schemas["LearnerComment"][] }) {
  return (
    <section aria-labelledby="commentaires">
      <h2 id="commentaires" className="m-0 mb-2 text-lg font-black tracking-[-0.01em] text-ink-900">
        Commentaires des enseignants
      </h2>
      {comments.length === 0 ? (
        <p className="m-0 rounded-[18px] border-[1.5px] border-dashed border-ink-200 bg-surface px-4.5 py-4 text-sm font-semibold text-ink-600">
          Aucun commentaire des enseignants pour l&apos;instant.
        </p>
      ) : (
        <ul aria-label="Commentaires des enseignants" className="m-0 flex list-none flex-col gap-2.5 p-0">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-[14px] border-[1.5px] border-ink-100 bg-surface px-4.5 py-3.5">
              <p className="m-0 text-sm leading-normal font-semibold whitespace-pre-line text-ink-800">{comment.body}</p>
              <p className="m-0 mt-1 text-xs font-bold text-ink-600">
                {comment.teacherName} · {comment.classroomName} ·{" "}
                <time dateTime={comment.createdAt}>{formatInstant(comment.createdAt)}</time>
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center">
      <dt className="text-[11px] font-extrabold tracking-[.04em] text-ink-600 uppercase">{label}</dt>
      <dd className="m-0 text-lg font-black text-ink-900">{value}</dd>
    </div>
  );
}

/** Carte profil (WPD03) : avatar, âge · classe · localité, badges / points / streak, actions. */
export function ChildProfileCard({ child }: { child: Child }) {
  const name = fullName(child);
  const meta = [childMeta(child), child.locality?.city].filter(Boolean).join(" · ");
  const avatarColor = child.avatar?.color ? `var(--${child.avatar.color})` : undefined;
  return (
    <section
      aria-labelledby="profil-enfant"
      className="flex flex-col items-center gap-3 rounded-[20px] border-[1.5px] border-ink-100 bg-surface p-5 text-center"
    >
      <Avatar name={name} emoji={child.avatar?.emoji} color={avatarColor} size={88} ring decorative />
      <div>
        <h2 id="profil-enfant" className="m-0 text-lg font-black text-ink-900">
          {name}
        </h2>
        {meta && <p className="m-0 text-[13px] font-semibold text-ink-600">{meta}</p>}
      </div>
      <dl className="m-0 grid w-full grid-cols-3 gap-2 rounded-lg bg-ink-50 px-2 py-3">
        <Stat label="Badges" value={child.badges} />
        <Stat label="Points" value={child.points.toLocaleString("fr-FR")} />
        <Stat label="Streak" value={`${child.streakDays} j`} />
      </dl>
      <div className="flex w-full flex-col gap-2">
        <Button href={p.editChild(child.id)} variant="outline" block>
          Modifier le profil
        </Button>
        <ResetChildPasswordDialog childId={child.id} firstName={child.firstName} username={child.username} />
        <Button href={p.weeklyReport(child.id)} variant="ghost" block>
          Rapport hebdomadaire
        </Button>
      </div>
    </section>
  );
}

/** « Informations » (WPD03) : seul écran, avec WPD10, où paraît la situation de handicap (D6). */
function ChildInformation({ child }: { child: Child }) {
  return (
    <InfoCard
      title="Informations"
      emptyLabel="Non renseigné"
      rows={[
        { label: "Identifiant", value: child.username },
        { label: "Lien de parenté", value: child.relationship.parentLabel || child.relationship.label },
        { label: "Date de naissance", value: formatDate(child.birthDate) },
        { label: "Inscrit le", value: formatInstant(child.createdAt) },
        { label: "Localité", value: child.locality && localityLabel(child.locality) },
        { label: "Situation de handicap", value: child.disability?.label ?? "Aucune" },
      ]}
    />
  );
}

/** Suppression du compte : lien danger vers WPD09, ou rappel d'une suppression déjà en cours (D54). */
function DeletionZone({ child }: { child: Child }) {
  const { deletion } = child;
  if (deletion?.status === "scheduled") {
    return (
      <p className="m-0 rounded-lg bg-error-50 p-3.5 text-sm font-bold text-error-700">
        {deletion.scheduledFor ? (
          <>
            Compte désactivé : suppression programmée le{" "}
            <time dateTime={deletion.scheduledFor}>{formatInstant(deletion.scheduledFor)}</time>.
          </>
        ) : (
          "Compte désactivé : suppression programmée."
        )}
      </p>
    );
  }
  return (
    <Link
      href={deletion ? p.deleteChild(child.id, deletion.id) : p.deleteChild(child.id)}
      className="flex min-h-11 items-center justify-center rounded-sm text-sm font-extrabold text-error-600 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-error-600"
    >
      {deletion ? "Examiner la demande de suppression" : "Supprimer le compte"}
    </Link>
  );
}

/** Rappel après la création (WPD04 : identifiant à communiquer) ou la modification du profil (WPD10). */
function Confirmation({ child, confirmation }: { child: Child; confirmation?: ChildConfirmation }) {
  if (confirmation === "modifie") return <SavedToast title={`Le profil de ${child.firstName} est enregistré.`} />;
  if (confirmation !== "cree") return null;
  return (
    <div role="status" className="flex items-start gap-3 rounded-[18px] border-2 border-success-200 bg-success-50 p-4">
      <span aria-hidden className="text-2xl">
        🎉
      </span>
      <div className="flex flex-col gap-1 text-sm font-semibold text-ink-700">
        <p className="m-0 text-[15px] font-black text-ink-900">Le compte de {child.firstName} est créé.</p>
        <p className="m-0">
          Son identifiant : <b className="text-ink-900">{child.username}</b>. Communiquez-lui cet identifiant et le mot
          de passe que vous avez choisi : à sa première connexion, {child.firstName} complétera son profil.
        </p>
      </div>
    </div>
  );
}

/** WPD03 · contenu, une fois l'enfant lu. */
export function ChildDetailView({
  child,
  comments = [],
  confirmation,
}: {
  child: Child;
  comments?: Schemas["LearnerComment"][];
  confirmation?: ChildConfirmation;
}) {
  return (
    <div className="flex flex-col gap-5">
      <Breadcrumb items={[{ label: "Mes enfants", href: p.children }, { label: fullName(child) }]} />
      <Confirmation child={child} confirmation={confirmation} />
      <div className="grid items-start gap-6 lg:grid-cols-[2fr_1fr]">
        <aside aria-label={`Profil de ${child.firstName}`} className="flex flex-col gap-4 lg:order-2">
          <ChildProfileCard child={child} />
          <ChildInformation child={child} />
          <DeletionZone child={child} />
        </aside>
        <div className="flex min-w-0 flex-col gap-6 lg:order-1">
          <CourseProgressList courses={child.courses} />
          <AttemptList attempts={child.recentAttempts} courses={child.courses} />
          <TeacherComments comments={comments} />
        </div>
      </div>
    </div>
  );
}

/** Confirmation lue dans l'URL (`?confirmation=`), ignorée si inconnue. */
export function parseConfirmation(value: string | string[] | undefined): ChildConfirmation | undefined {
  return value === "cree" || value === "modifie" ? value : undefined;
}

/** WPD03 · Détail d'un enfant du parent connecté ; celui d'un autre parent → « Enfant introuvable ». */
export async function ChildDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [child, comments] = await Promise.all([getChild(id), getTeacherComments(id)]);
  if (!child) return null;
  return <ChildDetailView child={child} comments={comments} confirmation={parseConfirmation(query.confirmation)} />;
}

/** Squelette de WPD03. */
export function ChildDetailSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Chargement du profil de votre enfant…" className="flex flex-col gap-5">
      <SkeletonBlock className="h-4 w-48 rounded-sm" />
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-3 lg:order-2">
          <SkeletonBlock className="h-80 rounded-[20px]" />
        </div>
        <div className="flex flex-col gap-3 lg:order-1">
          <SkeletonBlock className="h-6 w-56 rounded-sm" />
          <SkeletonBlock className="h-20 rounded-2xl" />
          <SkeletonBlock className="h-20 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
