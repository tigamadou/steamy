import { cx } from "@/lib/cx";

export type SkeletonBlockProps = {
  /** Dimensions et rayon par classes utilitaires (`h-40 w-full rounded-xl`). */
  className?: string;
};

// Bloc de skeleton structurel (SPEC-TECHNIQUE §6) : reproduit la forme du contenu attendu.
// Décoratif : la zone qui le contient porte `aria-busy` et un libellé de chargement.
export function SkeletonBlock({ className }: SkeletonBlockProps) {
  return (
    <div
      aria-hidden
      className={cx("h-4 w-full animate-pulse rounded-md bg-ink-100 motion-reduce:animate-none", className)}
    />
  );
}
