import { FOCUS } from "./styles";

export type ChartDataProps = {
  /** Titre du tableau (lu par les lecteurs d'écran). */
  caption: string;
  /** En-têtes des deux colonnes. */
  headers: [string, string];
  rows: Array<[string, string]>;
};

/** Alternative tabulaire d'un graphique : « Voir les données », repliée par défaut. */
export function ChartData({ caption, headers, rows }: ChartDataProps) {
  return (
    <details className="mt-2 text-xs">
      <summary className={`inline-block cursor-pointer rounded-sm font-extrabold text-ink-600 underline ${FOCUS}`}>
        Voir les données
      </summary>
      <table className="mt-2 w-full border-collapse text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header} scope="col" className="border-b border-ink-100 py-1 pr-3 font-extrabold text-ink-600">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([key, value], i) => (
            <tr key={`${key}-${i}`}>
              <th scope="row" className="py-1 pr-3 font-bold text-ink-700">
                {key}
              </th>
              <td className="py-1 font-bold text-ink-900">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
