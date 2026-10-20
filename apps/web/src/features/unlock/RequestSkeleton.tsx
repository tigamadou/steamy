import { SkeletonBlock } from "@/components/ds/SkeletonBlock";

/** Squelette de WA02 / WK08 : fil d'Ariane et carte de la demande. */
export function RequestSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Chargement de ta demande…"
      className="mx-auto flex w-full max-w-140 flex-col gap-3"
    >
      <SkeletonBlock className="h-4 w-64" />
      <div className="flex flex-col items-center gap-4 rounded-[22px] border-2 border-ink-100 px-6 py-8">
        <SkeletonBlock className="size-32 rounded-pill" />
        <SkeletonBlock className="h-6 w-3/4" />
        <SkeletonBlock className="h-16 w-full rounded-[18px]" />
        <SkeletonBlock className="h-12 w-2/3 rounded-pill" />
      </div>
    </div>
  );
}
