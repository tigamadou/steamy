import { cx } from "@/lib/cx";

const TONES = {
  level: "from-amber-300 to-amber-500 shadow-[0_6px_0_var(--amber-700)]",
  project: "from-primary-300 to-primary-600 shadow-[0_6px_0_var(--primary-700)]",
  course: "from-success-300 to-success-600 shadow-[0_6px_0_var(--success-700)]",
} as const;

export type MedalProps = {
  /** Emoji du badge, servi par l'API. */
  icon: string;
  /** Nom du badge (libellé accessible). */
  label: string;
  kind?: keyof typeof TONES;
  size?: number;
  className?: string;
};

// Médaille de badge (design/ds-complex.jsx, `Medal`) : disque en dégradé et anneau, emoji du badge au centre.
export function Medal({ icon, label, kind = "level", size = 160, className }: MedalProps) {
  return (
    <span
      role="img"
      aria-label={label}
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-pill bg-linear-135 ring-8 ring-white",
        TONES[kind],
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      <span aria-hidden>{icon}</span>
    </span>
  );
}
