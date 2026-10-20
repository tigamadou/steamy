"use client";

import { useState, type CSSProperties } from "react";

import { cx } from "@/lib/cx";

export type WKGalleryProps = {
  /** Nom du kit, pour les textes alternatifs. */
  name: string;
  /** Images du kit (API) ; la première sert de couverture. Sans image, le visuel de la catégorie. */
  images: readonly string[];
  emoji?: string;
  /** Couleur de la catégorie (API). */
  color?: string;
  /** Kit épuisé (WK11) : visuel atténué. */
  dimmed?: boolean;
  className?: string;
};

/** Galerie de la fiche kit (WK02) : grande image et vignettes, la vignette active est marquée (`aria-pressed`). */
export function WKGallery({ name, images, emoji, color, dimmed, className }: WKGalleryProps) {
  const [active, setActive] = useState(0);
  const current = images[Math.min(active, images.length - 1)];
  return (
    <div className={cx("flex flex-col gap-3", dimmed && "opacity-60 grayscale-[.4]", className)}>
      <div
        className="flex aspect-4/3 items-center justify-center overflow-hidden rounded-3xl bg-(--gallery-color) text-[96px] sm:text-[120px]"
        style={{ "--gallery-color": color ?? "var(--cat-robotique)" } as CSSProperties}
      >
        {current ? (
          // Images du stockage de l'API : dimensions inconnues, pas d'optimisation Next
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current} alt={`${name}, photo ${active + 1} sur ${images.length}`} className="size-full object-cover" />
        ) : (
          <span aria-hidden className="drop-shadow-md">
            {emoji}
          </span>
        )}
      </div>
      {images.length > 1 && (
        <ul className="flex flex-wrap gap-3" aria-label={`Photos de ${name}`}>
          {images.map((src, index) => (
            <li key={src}>
              <button
                type="button"
                aria-pressed={index === active}
                aria-label={`Afficher la photo ${index + 1}`}
                onClick={() => setActive(index)}
                className={cx(
                  "block size-16 cursor-pointer overflow-hidden rounded-[14px] border-2 bg-surface focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-500",
                  index === active ? "border-primary-500" : "border-ink-100 hover:border-ink-300",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
