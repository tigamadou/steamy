import { cx } from "@/lib/cx";

export type ActivityDay = {
  /** Jour affiché sous la barre (« lun. »). */
  label: string;
  /** Jour complet pour le tableau accessible (« lundi 12 octobre »). */
  fullLabel: string;
  seconds: number;
  /** Valeur lisible (« 25 min »). */
  value: string;
};

export type WeeklyActivityBarsProps = {
  days: ActivityDay[];
  /** Légende du tableau accessible. */
  caption: string;
  className?: string;
};

// Histogramme des 7 derniers jours (WD21) : barres CSS décoratives, et le même contenu en tableau masqué
// visuellement pour les technologies d'assistance. La hauteur est relative au jour le plus actif.
export function WeeklyActivityBars({ days, caption, className }: WeeklyActivityBarsProps) {
  const max = Math.max(1, ...days.map((day) => day.seconds));
  return (
    <div className={className}>
      <div aria-hidden className="flex h-36 items-end gap-2">
        {days.map((day) => (
          <div key={day.fullLabel} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            <div
              className={cx("w-full max-w-10 rounded-t-md", day.seconds > 0 ? "bg-primary-500" : "bg-ink-100")}
              style={{ height: `${Math.max(4, Math.round((day.seconds / max) * 100))}%` }}
            />
            <span className="text-[11px] font-bold text-ink-600">{day.label}</span>
          </div>
        ))}
      </div>
      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Jour</th>
            <th scope="col">Temps d&apos;apprentissage</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day.fullLabel}>
              <th scope="row">{day.fullLabel}</th>
              <td>{day.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
