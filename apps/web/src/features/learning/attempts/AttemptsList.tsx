import type { Schemas } from "@steamy/api-client";
import Link from "next/link";

import { attemptStatusLabel, type AttemptStatus } from "@/components/ds/AttemptStatusBadge";
import { Button } from "@/components/ds/Button";
import { Mascot } from "@/components/ds/Mascot";
import { QuizAttemptRow } from "@/components/ds/QuizAttemptRow";
import { SkeletonBlock } from "@/components/ds/SkeletonBlock";
import { Tabs } from "@/components/ds/Tabs";
import { getServerApi } from "@/lib/api";
import { cx } from "@/lib/cx";
import { routes } from "@/lib/routes";

import { quizStep } from "../tree";

export const ATTEMPTS_PAGE_SIZE = 20;
export const ATTEMPT_STATUSES: AttemptStatus[] = ["ok", "warn", "ko"];

const DAY = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Porto-Novo" });

/** URL de la liste avec son filtre et sa page (`?statut=`, `?page=`). */
export function attemptsHref(status: AttemptStatus | null, page = 1): string {
  const params = new URLSearchParams();
  if (status) params.set("statut", status);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `${routes.learner.attempts}?${query}` : routes.learner.attempts;
}

const FILTER_LABELS: Record<AttemptStatus, string> = { ok: "Réussis", warn: "À refaire", ko: "Échoués" };

function Stat({ label, value, success }: { label: string; value: string | number; success?: boolean }) {
  return (
    <div className="flex-1 rounded-[14px] border border-ink-100 bg-surface px-4 py-3.5">
      <dt className="text-[11px] font-extrabold tracking-[.04em] text-ink-600 uppercase">{label}</dt>
      <dd className={cx("m-0 mt-1 text-[22px] font-black", success ? "text-success-700" : "text-ink-900")}>{value}</dd>
    </div>
  );
}

/** Ligne d'une tentative de la liste (WD07). */
function row(attempt: Schemas["AttemptListItem"]) {
  return (
    <li key={attempt.id}>
      <QuizAttemptRow
        href={routes.learner.attempt(attempt.id)}
        title={attempt.quiz.title}
        subtitle={`${quizStep(attempt.quiz.kind)} · ${DAY.format(new Date(attempt.createdAt))}`}
        emoji={attempt.quiz.kind === "summative" ? "🏁" : "📝"}
        status={attempt.status}
        score={attempt.score}
        total={attempt.total}
      />
    </li>
  );
}

// WD07 (liste) / WD09 (vide) · Bandeau lu dans l'API (`summary`), filtre par statut serveur (D31) dans l'URL.
export async function AttemptsList({ status, page }: { status: AttemptStatus | null; page: number }) {
  const api = await getServerApi();
  const { data } = await api.GET("/api/learning/attempts/", {
    params: { query: { page, pageSize: ATTEMPTS_PAGE_SIZE, ...(status ? { status } : {}) } },
  });
  if (!data) throw new Error("Tentatives illisibles");
  const { summary } = data;
  const attempts = data.results ?? [];

  if (summary.attemptCount === 0) {
    return (
      <section aria-labelledby="pas-de-quiz" className="mx-auto flex max-w-md flex-col items-center gap-4 py-10 text-center">
        <Mascot pose="focus" size={140} />
        <h2 id="pas-de-quiz" className="m-0 text-2xl font-black text-ink-900">
          Pas encore de quiz
        </h2>
        <p className="m-0 text-sm font-semibold text-ink-600">
          Termine les missions d&apos;un niveau pour passer ton premier quiz : tes résultats apparaîtront ici.
        </p>
        <Button href={routes.learner.courses} iconRight="arrow-right">
          Voir mes parcours en cours
        </Button>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <dl className="m-0 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Taux de réussite" value={`${summary.successRate} %`} success />
        <Stat label="Tentatives" value={summary.attemptCount} />
        <Stat label="Quiz parfaits" value={summary.perfectCount} />
        <Stat label="Streak" value={`${summary.streakDays} j`} />
      </dl>
      <Tabs
        label="Filtrer les tentatives"
        activeHref={attemptsHref(status)}
        items={[
          { href: attemptsHref(null), label: "Tous" },
          ...ATTEMPT_STATUSES.map((s) => ({ href: attemptsHref(s), label: FILTER_LABELS[s] })),
        ]}
      />
      {attempts.length === 0 ? (
        <p className="m-0 rounded-lg bg-ink-50 p-4 text-sm font-bold text-ink-600">
          Aucune tentative « {status ? attemptStatusLabel(status) : ""} » pour l&apos;instant.
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">{attempts.map(row)}</ul>
      )}
      {(page > 1 || data.next) && (
        <nav aria-label="Pages des tentatives" className="flex justify-between gap-3">
          {page > 1 ? (
            <Link href={attemptsHref(status, page - 1)} className="text-sm font-black text-primary-600 hover:underline">
              ‹ Plus récentes
            </Link>
          ) : (
            <span />
          )}
          {data.next && (
            <Link href={attemptsHref(status, page + 1)} className="text-sm font-black text-primary-600 hover:underline">
              Plus anciennes ›
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

/** Squelette de WD07 : bandeau, filtres, lignes. */
export function AttemptsSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Chargement de tes tentatives…" className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonBlock key={i} className="h-20 rounded-[14px]" />
        ))}
      </div>
      <SkeletonBlock className="h-10 w-80 rounded-pill" />
      {[0, 1, 2, 3].map((i) => (
        <SkeletonBlock key={i} className="h-18 rounded-[14px]" />
      ))}
    </div>
  );
}
