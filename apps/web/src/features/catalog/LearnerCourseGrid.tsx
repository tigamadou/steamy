"use client";

import { CourseCard, type CourseCardData } from "@/components/ds/CourseCard";

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

/** Grille de cartes avec cœur (1 → 3 colonnes), partagée par WC01 et WW01. */
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
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map(({ slug, card }) => (
        <li key={slug} data-course={slug} className="flex">
          <CourseCard course={card} favorited={wished.has(slug)} onFav={() => onFav(slug)} className="flex-1" />
        </li>
      ))}
    </ul>
  );
}
