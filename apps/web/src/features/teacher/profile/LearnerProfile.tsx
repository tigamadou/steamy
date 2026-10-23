import Link from "next/link";

import { Avatar, Badge, Breadcrumb, InfoCard, Medal, ProgressBar, SkeletonBlock } from "@/components/ds";
import { formatInstant, formatRelative } from "@/lib/dates";
import { routes } from "@/lib/routes";

import { getLearnerFollowUp, type LearnerFollowUp, type TeacherAttempt } from "./api";
import { AttemptRow, quizContext } from "./AttemptRow";
import { CommentForm } from "./CommentForm";

/** « 72 % », ou un tiret quand l'élève n'a encore tenté aucun quiz du parcours. */
export function averageLabel(average: number | null): string {
  return average === null ? "—" : `${average} %`;
}

/** Tentative présélectionnée par `?tentative=` : seulement une tentative de cet élève, sinon aucune. */
export function selectedAttemptOf(attempts: TeacherAttempt[], value: string | string[] | undefined): number | undefined {
  const id = Array.isArray(value) ? value[0] : value;
  return attempts.find((attempt) => String(attempt.id) === id)?.id;
}

/**
 * WT05 · contenu : progression et tentatives du parcours de la classe, carte de l'élève (avatar, classe, badges,
 * moyenne), commentaire et historique. Aucune donnée hors du parcours encadré ni sensible : pas d'âge, pas de
 * téléphone, pas de « Message au parent » (D63, D64).
 */
export function LearnerProfileView({
  followUp,
  selectedAttempt,
}: {
  followUp: LearnerFollowUp;
  selectedAttempt?: number;
}) {
  const { learner, classroom, attempts, comments, badges } = followUp;
  const name = `${learner.firstName} ${learner.lastName}`.trim();
  return (
    <div className="flex flex-col gap-5">
      <Breadcrumb
        items={[
          { label: "Mes classes", href: routes.teacher.classes },
          { label: classroom.name, href: routes.teacher.classroom(classroom.id) },
          { label: name },
        ]}
      />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_21.25rem]">
        <div className="flex min-w-0 flex-col gap-5">
          <section aria-labelledby="progression-eleve" className="flex flex-col gap-3 rounded-[18px] border-[1.5px] border-ink-100 bg-surface p-4.5">
            <h2 id="progression-eleve" className="m-0 text-lg font-black tracking-[-0.01em] text-ink-900">
              Progression sur {classroom.course.title}
            </h2>
            <ProgressBar value={followUp.progressPct} label={`Progression de ${name}`} showLabel size="lg" />
            <p className="m-0 flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-600">
              Dernière activité {formatRelative(followUp.lastActivityAt)}
              {followUp.isDropout && <Badge tone="amber">Décrochage</Badge>}
            </p>
          </section>
          <section aria-labelledby="tentatives-eleve" className="flex flex-col gap-2">
            <h2 id="tentatives-eleve" className="m-0 text-lg font-black tracking-[-0.01em] text-ink-900">
              Tentatives
            </h2>
            {attempts.length === 0 ? (
              <p className="m-0 rounded-[14px] border border-dashed border-ink-200 bg-surface px-4.5 py-5 text-sm font-semibold text-ink-600">
                Aucune tentative de quiz sur ce parcours pour l&apos;instant.
              </p>
            ) : (
              <ul aria-label="Tentatives de l'élève" className="m-0 flex list-none flex-col gap-2 p-0">
                {attempts.map((attempt) => (
                  <li key={attempt.id}>
                    <AttemptRow
                      attempt={attempt}
                      learnerId={learner.id}
                      classroomId={classroom.id}
                      selected={attempt.id === selectedAttempt}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <aside aria-label="Élève" className="flex flex-col gap-4">
          <div className="flex items-center gap-3.5 rounded-[18px] border-[1.5px] border-ink-100 bg-surface p-4.5">
            <Avatar name={name} emoji={learner.avatar?.emoji} size={56} ring decorative />
            <div className="min-w-0">
              <h2 className="m-0 text-base font-black text-ink-900">{name}</h2>
              <Link
                href={routes.teacher.classroom(classroom.id)}
                className="rounded-sm text-[13px] font-bold text-primary-600 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
              >
                {classroom.name}
              </Link>
            </div>
          </div>
          <InfoCard
            title="Sur le parcours"
            rows={[
              { label: "Moyenne des quiz", value: averageLabel(followUp.averagePercentage) },
              { label: "Dans la classe depuis le", value: formatInstant(followUp.joinedAt) },
            ]}
          />
          <section aria-labelledby="badges-eleve" className="flex flex-col gap-2.5 rounded-lg border border-ink-100 bg-surface p-4.5">
            <h2 id="badges-eleve" className="m-0 text-sm font-black text-ink-900">
              Badges du parcours
            </h2>
            {badges.length === 0 ? (
              <p className="m-0 text-[13px] font-semibold text-ink-600">Aucun badge obtenu pour l&apos;instant.</p>
            ) : (
              <ul aria-label="Badges obtenus" className="m-0 flex list-none flex-wrap gap-3 p-0">
                {badges.map((badge) => (
                  <li key={badge.id} className="flex flex-col items-center gap-1 text-center">
                    <Medal icon={badge.icon} label={badge.label} kind={badge.kind} size={52} className="ring-4" />
                    <span className="max-w-20 text-[11px] font-bold text-ink-700">{badge.label}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section aria-labelledby="commenter" className="flex flex-col gap-3 rounded-[18px] border-[1.5px] border-ink-100 bg-surface p-4.5">
            <h2 id="commenter" className="m-0 text-base font-black text-ink-900">
              Commenter
            </h2>
            <CommentForm
              learnerId={learner.id}
              classroomId={classroom.id}
              attempts={attempts}
              defaultAttemptId={selectedAttempt}
            />
          </section>
          <section aria-labelledby="historique" className="flex flex-col gap-2.5">
            <h2 id="historique" className="m-0 text-base font-black text-ink-900">
              Commentaires envoyés
            </h2>
            {comments.length === 0 ? (
              <p className="m-0 text-[13px] font-semibold text-ink-600">Aucun commentaire envoyé pour l&apos;instant.</p>
            ) : (
              <ul aria-label="Commentaires envoyés" className="m-0 flex list-none flex-col gap-2 p-0">
                {comments.map((comment) => {
                  const attempt = attempts.find((item) => item.id === comment.attemptId);
                  return (
                    <li key={comment.id} className="rounded-[14px] border border-ink-100 bg-surface px-3.5 py-3">
                      <p className="m-0 text-xs font-bold text-ink-600">
                        {formatInstant(comment.createdAt)}
                        {attempt && ` · ${attempt.quiz.title} (${quizContext(attempt.quiz)})`}
                      </p>
                      <p className="m-0 mt-1 text-sm font-semibold whitespace-pre-line text-ink-800">{comment.body}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

type SearchParams = Record<string, string | string[] | undefined>;

/** WT05 · profil d'un élève dans une de mes classes, lu côté serveur ; un élève hors de mes classes est introuvable. */
export async function LearnerProfile({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const classroom = Array.isArray(query.classe) ? query.classe[0] : query.classe;
  const followUp = await getLearnerFollowUp(id, classroom);
  return followUp && <LearnerProfileView followUp={followUp} selectedAttempt={selectedAttemptOf(followUp.attempts, query.tentative)} />;
}

/** Squelette de WT05 : fil, progression, tentatives et carte de l'élève. */
export function LearnerProfileSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Chargement du profil…" className="flex flex-col gap-5">
      <SkeletonBlock className="h-5 w-64 rounded-sm" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_21.25rem]">
        <div className="flex flex-col gap-3">
          <SkeletonBlock className="h-28 rounded-[18px]" />
          <SkeletonBlock className="h-18 rounded-[14px]" />
          <SkeletonBlock className="h-18 rounded-[14px]" />
        </div>
        <SkeletonBlock className="h-80 rounded-[18px]" />
      </div>
    </div>
  );
}
