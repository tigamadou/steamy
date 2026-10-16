import { SkeletonBlock } from "@/components/ds";
import { CourseGridSkeleton } from "@/components/public/catalog";

/** WD03 · squelette fidèle à WD01 : carte de reprise, pastilles, raccourcis et « Pour toi ». */
export function DashboardSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Chargement de ton tableau de bord…" className="flex flex-col gap-5">
      <SkeletonBlock className="h-40 rounded-[22px]" />
      <div className="flex flex-col gap-4 sm:flex-row">
        <SkeletonBlock className="h-16 rounded-lg" />
        <SkeletonBlock className="h-16 rounded-lg" />
        <SkeletonBlock className="h-16 rounded-lg" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SkeletonBlock className="h-22 rounded-xl" />
        <SkeletonBlock className="h-22 rounded-xl" />
        <SkeletonBlock className="h-22 rounded-xl" />
      </div>
      <div>
        <SkeletonBlock className="mb-3 h-5 w-30 rounded-sm" />
        <CourseGridSkeleton label="Chargement des recommandations…" />
      </div>
    </div>
  );
}
