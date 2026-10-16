"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { Button, Mascot } from "@/components/ds";
import { CourseList, type LearnerCourseItem } from "@/features/catalog/LearnerCourseGrid";
import { useWishlist } from "@/features/catalog/use-wishlist";
import { routes } from "@/lib/routes";

/** « 1 parcours sauvegardé », « 3 parcours sauvegardés ». */
export function savedLabel(count: number): string {
  return `${count} parcours sauvegardé${count > 1 ? "s" : ""}`;
}

/**
 * WW01-WW03 · Souhaits : clic sur le cœur → retrait optimiste et toast « Annuler » (WW03) ; plus aucun souhait →
 * WW02. Le compteur suit l'état affiché.
 */
export function WishlistGrid({ items, sort }: { items: LearnerCourseItem[]; sort: ReactNode }) {
  const wishlist = useWishlist(items.map((item) => item.slug));
  const visible = items.filter((item) => wishlist.wished.has(item.slug));
  const grid = useRef<HTMLDivElement>(null);
  // Carte revenue à l'écran (annulation, ou retrait refusé) : le focus retourne sur son cœur
  const [restored, setRestored] = useState<{ slug: string } | null>(null);
  useEffect(() => {
    if (!restored) return;
    grid.current?.querySelector<HTMLButtonElement>(`[data-course="${CSS.escape(restored.slug)}"] button`)?.focus();
  }, [restored]);

  // La carte retirée disparaît : le focus passe sur « Annuler » du toast (WCAG 2.4.3)
  const remove = (slug: string) =>
    wishlist.toggle(slug, { focusUndo: true, onRestore: () => setRestored({ slug }) });

  return (
    <>
      {visible.length > 0 ? (
        <>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-[14px] bg-ink-50 px-5 py-3.5">
            <p aria-live="polite" className="text-[15px] font-extrabold text-ink-900">
              <strong className="text-primary-600">{savedLabel(visible.length)}</strong>
              <span className="ml-1 text-[13px] font-semibold text-ink-600">· garde un œil sur ce qui te plaît</span>
            </p>
            {sort}
          </div>
          <h2 className="sr-only">Mes parcours sauvegardés</h2>
          <div ref={grid}>
            <CourseList items={visible} wished={wishlist.wished} onFav={remove} />
          </div>
        </>
      ) : (
        <WishlistEmpty />
      )}
      {wishlist.toast}
    </>
  );
}

/** WW02 · Aucun souhait : renvoi vers le catalogue. */
export function WishlistEmpty() {
  return (
    <div className="mx-auto flex max-w-[480px] flex-col items-center gap-4 px-6 py-10 text-center">
      <Mascot pose="wave" size={160} />
      <h2 className="text-2xl font-black text-ink-900">Aucun parcours en souhaits</h2>
      <p className="text-sm leading-normal font-semibold text-ink-600">
        Repère tes parcours préférés en cliquant sur le cœur : tu les retrouveras ici pour les commencer plus tard.
      </p>
      <Button size="lg" iconRight="arrow-right" href={routes.learner.catalog} className="mt-2">
        Découvrir le catalogue
      </Button>
    </div>
  );
}
