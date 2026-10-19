import { SkeletonBlock } from "@/components/ds/SkeletonBlock";

/** Squelette d'un contenu pédagogique (WJ01-WJ03) : fil d'Ariane, titre, bloc principal, liste. */
export function ContentSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Chargement du contenu…" className="flex flex-col gap-5">
      <SkeletonBlock className="h-4 w-72" />
      <SkeletonBlock className="h-8 w-2/3" />
      <SkeletonBlock className="aspect-video max-h-96 w-full rounded-[22px]" />
      <SkeletonBlock className="h-20 rounded-lg" />
    </div>
  );
}
