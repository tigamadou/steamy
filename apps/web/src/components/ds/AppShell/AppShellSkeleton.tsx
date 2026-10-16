import { SkeletonBlock } from "../SkeletonBlock";

export type AppShellSkeletonProps = {
  /** Annonce du chargement (registre de l'espace). */
  label: string;
  /** Nombre d'entrées de navigation esquissées. */
  navCount?: number;
};

// Squelette du shell pendant la lecture de la session : même gabarit que `AppShell`, sans donnée.
export function AppShellSkeleton({ label, navCount = 5 }: AppShellSkeletonProps) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className="flex min-h-dvh bg-bg">
      <div className="hidden w-62 shrink-0 flex-col gap-2 border-r border-ink-100 bg-surface px-4 py-6 md:flex">
        <SkeletonBlock className="mb-6 h-9 w-32" />
        {Array.from({ length: navCount }, (_, i) => (
          <SkeletonBlock key={i} className="h-11 rounded-md" />
        ))}
        <SkeletonBlock className="mt-auto h-14 rounded-[14px]" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-16 items-center justify-between gap-4 border-b border-ink-100 bg-surface px-4 md:px-7">
          <SkeletonBlock className="h-6 w-40" />
          <div className="flex items-center gap-3">
            <SkeletonBlock className="hidden h-10 w-80 rounded-pill lg:block" />
            <SkeletonBlock className="size-10 rounded-md" />
            <SkeletonBlock className="size-9 rounded-pill" />
          </div>
        </div>
        <div className="flex flex-col gap-5 px-4 py-6 md:px-8 md:py-7">
          <SkeletonBlock className="h-40 rounded-[22px]" />
          <SkeletonBlock className="h-16 rounded-lg" />
          <SkeletonBlock className="h-56 rounded-[22px]" />
        </div>
      </div>
    </div>
  );
}
