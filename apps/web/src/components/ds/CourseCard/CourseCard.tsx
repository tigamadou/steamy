import Link from "next/link";
import type { CSSProperties } from "react";

import { cx } from "@/lib/cx";

import { Badge } from "../Badge";
import { Icon } from "../Icon";

export type CourseCardData = {
  href: string;
  title: string;
  /** Libellé de difficulté (S2 : « difficulté », jamais « niveau »). */
  difficulty?: string;
  author?: string;
  isFree: boolean;
  /** Prix déjà mis en forme (« 15 000 F CFA ») ; ignoré si `isFree`. */
  priceLabel?: string;
  /** Couleur de la catégorie (API) ou token. */
  color?: string;
  emoji?: string;
};

export type CourseCardProps = {
  course: CourseCardData;
  /** Cœur de la liste de souhaits : absent sans `onFav` (site public), activé au lot 3. */
  onFav?: () => void;
  favorited?: boolean;
  className?: string;
};

// Carte parcours (design/ds-complex.jsx). Toute la carte est cliquable par un lien étiré sur le titre ;
// pas de note (C8).
export function CourseCard({ course, onFav, favorited, className }: CourseCardProps) {
  return (
    <article
      className={cx(
        "group relative flex flex-col overflow-hidden rounded-[22px] border-2 border-ink-100 bg-surface transition-[transform,box-shadow,border-color] duration-200 ease-(--ease-out)",
        "hover:-translate-y-[3px] hover:border-primary-200 hover:shadow-card-hover focus-within:border-primary-200 motion-reduce:hover:translate-y-0",
        className,
      )}
    >
      <div
        className="relative flex aspect-16/10 items-center justify-center overflow-hidden bg-(--card-color)"
        style={{ "--card-color": course.color ?? "var(--cat-robotique)" } as CSSProperties}
      >
        <span aria-hidden className="absolute -bottom-2 left-6 size-11 rounded-pill bg-white/20" />
        <span aria-hidden className="absolute top-6 right-16 size-7 rounded-pill bg-white/10" />
        {course.emoji && (
          <span aria-hidden className="relative text-[56px] drop-shadow-md">
            {course.emoji}
          </span>
        )}
        {onFav && (
          <button
            type="button"
            onClick={onFav}
            aria-pressed={!!favorited}
            aria-label={`Ajouter « ${course.title} » à ma liste de souhaits`}
            className={cx(
              "absolute top-3 right-3 z-10 flex size-9 cursor-pointer items-center justify-center rounded-pill bg-surface/90",
              "focus-visible:outline-3 focus-visible:outline-primary-500",
              favorited ? "text-error-600" : "text-ink-700",
            )}
          >
            <Icon name="heart" size={18} strokeWidth={2.5} fill={favorited ? "currentColor" : "none"} />
          </button>
        )}
        <span
          className={cx(
            "absolute bottom-3 left-3 rounded-pill px-3 py-1.5 text-[13px] font-extrabold text-white",
            course.isFree ? "bg-success-700" : "bg-ink-900/80 backdrop-blur-sm",
          )}
        >
          {course.isFree ? "Gratuit" : course.priceLabel}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        {course.difficulty && (
          <div>
            <Badge tone="primary">{course.difficulty}</Badge>
          </div>
        )}
        <h3 className="text-[17px] leading-tight font-extrabold text-pretty text-ink-900">
          <Link
            href={course.href}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none after:focus-visible:rounded-[20px] after:focus-visible:outline-3 after:focus-visible:outline-primary-500"
          >
            {course.title}
          </Link>
        </h3>
        {course.author && <p className="text-[13px] font-semibold text-ink-600">Par {course.author}</p>}
      </div>
    </article>
  );
}
