import type { CSSProperties } from "react";

import { cx } from "@/lib/cx";

// Fonds choisis pour un contraste AA avec le texte blanc (initiales). Jamais de photo de mineur (D15) :
// emoji (avatars servis par l'API) ou initiales.
const COLORS = [
  "var(--primary-600)",
  "var(--success-700)",
  "var(--amber-700)",
  "var(--info-700)",
  "var(--cat-robotique)",
  "var(--ink-700)",
];

export type AvatarProps = {
  /** Nom affiché : sert d'initiales, de libellé accessible et de graine de couleur. */
  name: string;
  emoji?: string;
  /** Diamètre en pixels. */
  size?: number;
  /** Couleur de fond (token) ; par défaut dérivée du nom. */
  color?: string;
  /** Anneau ambre (mise en avant). */
  ring?: boolean;
  /** Pastille de présence. */
  status?: boolean;
  /** À cocher quand le nom est déjà écrit à côté de l'avatar. */
  decorative?: boolean;
  className?: string;
};

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? words[0][0] + words[words.length - 1][0] : (words[0] ?? "").slice(0, 2);
  return letters.toUpperCase();
}

export function Avatar({ name, emoji, size = 48, color, ring, status, decorative, className }: AvatarProps) {
  const background = color ?? COLORS[(name.codePointAt(0) ?? 0) % COLORS.length];
  const a11y = decorative ? { "aria-hidden": true } : { role: "img", "aria-label": name };
  return (
    <span
      {...a11y}
      className={cx(
        "relative inline-flex size-(--avatar-size) shrink-0 items-center justify-center rounded-pill bg-(--avatar-bg) text-(length:--avatar-font) font-black leading-none text-white",
        ring && "shadow-[0_0_0_3px_var(--surface),0_0_0_5px_var(--amber-500)]",
        className,
      )}
      style={
        {
          "--avatar-size": `${size}px`,
          "--avatar-font": `${Math.round(size * 0.4)}px`,
          "--avatar-bg": emoji ? "var(--primary-100)" : background,
        } as CSSProperties
      }
    >
      <span aria-hidden>{emoji ?? initials(name)}</span>
      {status && (
        <span className="absolute right-0 bottom-0 size-3 rounded-pill border-2 border-surface bg-success-500" />
      )}
    </span>
  );
}
