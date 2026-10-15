import { ChartData } from "./ChartData";
import { EmptyChart } from "./EmptyChart";
import { formatNumber } from "./styles";

export type SparklineProps = {
  data: number[];
  /** Nom accessible du graphique (ex. « Nouveaux apprenants »). */
  label: string;
  /** Périodes des points, pour le tableau « Voir les données ». */
  labels?: string[];
  width?: number;
  height?: number;
  /** Couleur du trait (token), encre par défaut. */
  color?: string;
  strokeWidth?: number;
  /** Aire légère sous la courbe. */
  area?: boolean;
  /** Affiche « Voir les données » (sinon le libellé accessible résume la tendance). */
  showData?: boolean;
  format?: (value: number) => string;
};

// Tendance compacte (design/ds-charts.jsx) : polyline SVG, monochrome par défaut.
export function Sparkline({
  data,
  label,
  labels,
  width = 96,
  height = 28,
  color = "var(--ink-900)",
  strokeWidth = 2,
  area = false,
  showData = false,
  format = formatNumber,
}: SparklineProps) {
  if (data.length === 0) return <EmptyChart label={label} />;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const pad = strokeWidth + 1;
  const x = (i: number) => (data.length > 1 ? (i * width) / (data.length - 1) : width / 2);
  const y = (v: number) => pad + (height - pad * 2) * (1 - (v - min) / span);
  const points = data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const first = data[0];
  const last = data[data.length - 1];
  const summary = data.length > 1 ? `${label} : de ${format(first)} à ${format(last)}` : `${label} : ${format(last)}`;

  return (
    <div className="min-w-0">
      <svg
        role="img"
        aria-label={summary}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="block overflow-visible"
      >
        {area && data.length > 1 && (
          <polygon points={`0,${height} ${points} ${width},${height}`} fill={color} opacity={0.08} />
        )}
        {data.length > 1 ? (
          <polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <circle cx={x(0)} cy={height / 2} r={strokeWidth + 1} fill={color} />
        )}
      </svg>
      {showData && (
        <ChartData
          caption={label}
          headers={["Période", "Valeur"]}
          rows={data.map((v, i) => [labels?.[i] ?? String(i + 1), format(v)])}
        />
      )}
    </div>
  );
}
