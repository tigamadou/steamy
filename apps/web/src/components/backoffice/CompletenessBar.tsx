import { useId } from "react";

/** Part des indicateurs manuels renseignés (entier de 0 à 100) ; aucun indicateur → 0. */
export function completeness(entered: number, total: number): number {
  return total > 0 ? Math.round((100 * entered) / total) : 0;
}

/** Complétude du rapport (WAD01, WAD04) : barre de progression nommée, valeurs du serveur. */
export function CompletenessBar({ entered, total, label = "Complétude du rapport" }: { entered: number; total: number; label?: string }) {
  const id = useId();
  const percent = completeness(entered, total);
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-extrabold text-ink-700">
        <span id={id}>{label}</span>
        <span>{percent} %</span>
      </div>
      <div
        role="progressbar"
        aria-labelledby={id}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-100"
      >
        <div className="h-full rounded-full bg-ink-900" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
