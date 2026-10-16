import type { CSSProperties } from "react";

import { cx } from "@/lib/cx";

// Zeti, la mascotte robot (portée de design/ds-mascot.jsx). Toujours décorative :
// le texte qui l'accompagne porte le sens.
type PoseConfig = {
  eyeY: number;
  mouth: "smile" | "open" | "cheer" | "flat" | "sad";
  cheeks: boolean;
  arms: "down" | "wave" | "up";
  stars?: boolean;
  sleeping?: boolean;
};

const POSES = {
  idle: { eyeY: 0, mouth: "smile", cheeks: true, arms: "down" },
  wave: { eyeY: 0, mouth: "open", cheeks: true, arms: "wave" },
  cheer: { eyeY: -1, mouth: "cheer", cheeks: true, arms: "up", stars: true },
  focus: { eyeY: 0, mouth: "flat", cheeks: false, arms: "down" },
  sad: { eyeY: 2, mouth: "sad", cheeks: false, arms: "down" },
  sleep: { eyeY: 0, mouth: "flat", cheeks: false, arms: "down", sleeping: true },
} satisfies Record<string, PoseConfig>;

export type MascotPose = keyof typeof POSES;

export const MASCOT_POSES = Object.keys(POSES) as MascotPose[];

export type MascotProps = {
  pose?: MascotPose;
  /** Largeur en pixels. */
  size?: number;
  /** Couleur du corps : une valeur CSS, de préférence un token (`var(--cat-ia)`). */
  hue?: string;
  className?: string;
};

const BODY = "fill-(--mascot-hue) stroke-mascot-ink";
const LINE = "stroke-mascot-ink";

export function Mascot({ pose = "idle", size = 120, hue, className }: MascotProps) {
  const cfg: PoseConfig = POSES[pose];
  const style = hue ? ({ "--mascot-hue": hue } as CSSProperties) : undefined;

  return (
    <svg
      viewBox="0 0 112 128"
      width={size}
      height={(size * 128) / 112}
      aria-hidden
      focusable="false"
      data-pose={pose}
      className={cx("block", !hue && "[--mascot-hue:var(--primary-500)]", className)}
      style={style}
    >
      {/* Antenne */}
      <line x1="56" y1="22" x2="56" y2="10" strokeWidth="3" strokeLinecap="round" className={LINE} />
      <circle cx="56" cy="8" r="5" strokeWidth="2.5" className="fill-brand-orange stroke-mascot-ink" />
      <circle cx="54" cy="6" r="1.6" opacity=".9" className="fill-white" />

      {/* Corps */}
      <rect x="34" y="98" width="44" height="22" rx="11" strokeWidth="3" className={BODY} />
      <rect x="44" y="105" width="24" height="8" rx="2" opacity=".25" className="fill-mascot-ink" />

      {/* Bras */}
      {cfg.arms === "down" && (
        <>
          <circle cx="28" cy="106" r="8" strokeWidth="3" className={BODY} />
          <circle cx="84" cy="106" r="8" strokeWidth="3" className={BODY} />
        </>
      )}
      {cfg.arms === "wave" && (
        <>
          <circle cx="28" cy="106" r="8" strokeWidth="3" className={BODY} />
          <circle cx="92" cy="78" r="8" strokeWidth="3" className={BODY} />
          <line x1="84" y1="100" x2="92" y2="78" strokeWidth="3" strokeLinecap="round" className={LINE} />
        </>
      )}
      {cfg.arms === "up" && (
        <>
          <circle cx="22" cy="68" r="8" strokeWidth="3" className={BODY} />
          <line x1="34" y1="98" x2="22" y2="76" strokeWidth="3" strokeLinecap="round" className={LINE} />
          <circle cx="92" cy="68" r="8" strokeWidth="3" className={BODY} />
          <line x1="78" y1="98" x2="92" y2="76" strokeWidth="3" strokeLinecap="round" className={LINE} />
        </>
      )}

      {/* Tête et visière */}
      <rect x="20" y="28" width="72" height="68" rx="22" strokeWidth="3" className={BODY} />
      <rect x="30" y="40" width="52" height="44" rx="14" strokeWidth="2.5" className="fill-white stroke-mascot-ink" />

      {/* Yeux */}
      {cfg.sleeping ? (
        <>
          <path d="M32 62 q6 -3 12 0" strokeWidth="2.4" fill="none" strokeLinecap="round" className={LINE} />
          <path d="M68 62 q6 -3 12 0" strokeWidth="2.4" fill="none" strokeLinecap="round" className={LINE} />
        </>
      ) : (
        <>
          <ellipse cx="38" cy={62 + cfg.eyeY} rx="6" ry="7" className="fill-mascot-ink" />
          <ellipse cx="74" cy={62 + cfg.eyeY} rx="6" ry="7" className="fill-mascot-ink" />
          <circle cx="40.5" cy={60 + cfg.eyeY} r="2" className="fill-white" />
          <circle cx="76.5" cy={60 + cfg.eyeY} r="2" className="fill-white" />
          {cfg.stars && (
            <>
              <path d="M38 60 l1.6 1.6 1.6-1.6-1.6-1.6z" transform="translate(-2 0)" className="fill-brand-orange" />
              <path d="M74 60 l1.6 1.6 1.6-1.6-1.6-1.6z" transform="translate(-2 0)" className="fill-brand-orange" />
            </>
          )}
        </>
      )}

      {/* Bouche */}
      {cfg.mouth === "smile" && (
        <path d="M48 80 q8 8 16 0" strokeWidth="3" fill="none" strokeLinecap="round" className={LINE} />
      )}
      {cfg.mouth === "open" && <ellipse cx="56" cy="82" rx="6" ry="4" className="fill-mascot-ink" />}
      {cfg.mouth === "cheer" && <path d="M44 78 q12 14 24 0 q-12 6 -24 0z" className="fill-mascot-ink" />}
      {cfg.mouth === "flat" && (
        <line x1="50" y1="82" x2="62" y2="82" strokeWidth="3" strokeLinecap="round" className={LINE} />
      )}
      {cfg.mouth === "sad" && (
        <path d="M48 86 q8 -8 16 0" strokeWidth="3" fill="none" strokeLinecap="round" className={LINE} />
      )}

      {/* Joues */}
      {cfg.cheeks && (
        <>
          <ellipse cx="32" cy="76" rx="4.5" ry="3" opacity=".75" className="fill-mascot-cheek" />
          <ellipse cx="80" cy="76" rx="4.5" ry="3" opacity=".75" className="fill-mascot-cheek" />
        </>
      )}

      {/* Sommeil */}
      {cfg.sleeping && (
        <text x="92" y="38" fontSize="14" fontWeight="800" className="fill-mascot-ink font-sans">
          z
        </text>
      )}
    </svg>
  );
}
