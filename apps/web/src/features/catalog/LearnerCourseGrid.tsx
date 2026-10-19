"use client";

import type { CourseCardData } from "@/components/ds/CourseCard";
import { CourseCardList } from "@/components/public/catalog";

import { useWishlist } from "./use-wishlist";

export type LearnerCourseItem = { slug: string; card: CourseCardData };

/** Grille de WC01-WC02 : cartes de la page du catalogue (en cache) et cœurs des souhaits de l'apprenant. */
export function LearnerCourseGrid({ items, wished }: { items: LearnerCourseItem[]; wished: string[] }) {
  const wishlist = useWishlist(wished);
  return (
    <>
      <CourseList items={items} wished={wishlist.wished} onFav={wishlist.toggle} />
      {wishlist.toast}
    </>
  );
}

/** Grille de cartes avec cœur, partagée par WC01 et WW01 (grille unique `CourseCardList`). */
export function CourseList({
  items,
  wished,
  onFav,
}: {
  items: LearnerCourseItem[];
  wished: Set<string>;
  onFav: (slug: string) => void;
}) {
  return (
    <CourseCardList
      narrow
      items={items.map(({ slug, card }) => ({ slug, card, favorited: wished.has(slug), onFav: () => onFav(slug) }))}
    />
  );
}
