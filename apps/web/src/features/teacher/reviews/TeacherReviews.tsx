import { redirect } from "next/navigation";

import { SkeletonBlock, Tabs } from "@/components/ds";
import { getClassrooms } from "@/features/teacher/classes/api";
import { getServerApi } from "@/lib/api";
import { readOrNull } from "@/lib/api-read";
import { routes } from "@/lib/routes";

import { ClassroomFilter } from "./ClassroomFilter";
import { FILTER_LABELS, FILTER_QUERY, REVIEW_FILTERS, parseReviewParams, type ReviewParams } from "./params";
import { ReviewList } from "./ReviewList";

/** Évaluations par page. */
export const REVIEWS_PAGE_SIZE = 20;

type SearchParams = Record<string, string | string[] | undefined>;

/** WT07 · filtres Toutes / Formatives / Sommatives / À revoir et classe dans l'URL, lignes paginées, lues côté serveur. */
export async function TeacherReviews({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const requested = parseReviewParams(await searchParams);
  const api = await getServerApi();
  const [classrooms, list] = await Promise.all([
    getClassrooms(),
    api.GET("/api/classrooms/reviews/", {
      params: {
        query: {
          ...FILTER_QUERY[requested.filter],
          classroomId: requested.classroomId ? Number(requested.classroomId) : undefined,
          page: requested.page,
          pageSize: REVIEWS_PAGE_SIZE,
        },
      },
    }),
  ]);
  // Page au-delà de la dernière (URL saisie à la main) : retour à la première
  if (list.response.status === 404 && requested.page > 1) {
    redirect(routes.teacher.reviews({ filter: requested.filter, classroomId: requested.classroomId }));
  }
  const data = readOrNull(list);
  if (!data || !classrooms) return null;
  // Une classe qui n'est pas la mienne n'est pas proposée : le filtre de l'URL retombe sur toutes les classes
  const params: ReviewParams = {
    ...requested,
    classroomId: classrooms.some((classroom) => String(classroom.id) === requested.classroomId)
      ? requested.classroomId
      : undefined,
  };
  const base = (filter: ReviewParams["filter"]) => routes.teacher.reviews({ filter, classroomId: params.classroomId });
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          label="Filtrer les évaluations"
          activeHref={base(params.filter)}
          items={REVIEW_FILTERS.map((filter) => ({ href: base(filter), label: FILTER_LABELS[filter] }))}
        />
        <ClassroomFilter classrooms={classrooms} params={params} />
      </div>
      <p role="status" className="m-0 text-sm font-bold text-ink-600">
        {data.count ?? 0} évaluation{(data.count ?? 0) > 1 ? "s" : ""}
      </p>
      <ReviewList reviews={data.results ?? []} params={params} hasNext={!!data.next} />
    </div>
  );
}

/** Squelette de WT07 : onglets et lignes. */
export function TeacherReviewsSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Chargement des évaluations…" className="flex flex-col gap-4">
      <SkeletonBlock className="h-10 w-80 rounded-pill" />
      <SkeletonBlock className="h-18 rounded-[14px]" />
      <SkeletonBlock className="h-18 rounded-[14px]" />
      <SkeletonBlock className="h-18 rounded-[14px]" />
    </div>
  );
}
