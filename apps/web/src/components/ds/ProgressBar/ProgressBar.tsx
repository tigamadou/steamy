import { cx } from "@/lib/cx";

const TONES = {
  primary: "bg-primary-500",
  success: "bg-success-500",
  amber: "bg-amber-400",
} as const;

export type ProgressBarProps = {
  /** Pourcentage renvoyé par l'API (borné à 0-100 pour l'affichage seulement). */
  value: number;
  /** Libellé accessible ; affiché au-dessus de la barre avec le pourcentage si `showLabel`. */
  label: string;
  showLabel?: boolean;
  tone?: keyof typeof TONES;
  size?: "md" | "lg";
  /** Piste claire sur fond coloré (carte de reprise). */
  inverse?: boolean;
  className?: string;
};

// Barre de progression (design/ds-complex.jsx, `ProgressBar`) : rôle `progressbar`, valeur annoncée.
export function ProgressBar({
  value,
  label,
  showLabel,
  tone = "primary",
  size = "md",
  inverse,
  className,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div className={cx("flex w-full flex-col gap-1.5", className)}>
      {showLabel && (
        <div aria-hidden className="flex justify-between text-sm font-extrabold text-ink-700">
          <span>{label}</span>
          <span>{pct} %</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cx(
          "w-full overflow-hidden rounded-pill",
          size === "lg" ? "h-3" : "h-2",
          inverse ? "bg-white/25" : "bg-ink-100",
        )}
      >
        <div className={cx("h-full rounded-pill", TONES[tone])} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
