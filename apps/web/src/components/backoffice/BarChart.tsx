import { ChartData } from "./ChartData";
import { EmptyChart } from "./EmptyChart";
import { formatNumber } from "./styles";

export type BarChartProps = {
  data: number[];
  /** Nom accessible du graphique (ex. « Valeur par période »). */
  label: string;
  /** Libellé de chaque barre (axe et tableau « Voir les données »). */
  labels?: string[];
  width?: number;
  height?: number;
  color?: string;
  gap?: number;
  /** Atténue les barres sauf la dernière (période courante). */
  highlightLast?: boolean;
  format?: (value: number) => string;
};

// Valeurs par période (design/ds-charts.jsx) : barres SVG verticales, monochrome par défaut.
export function BarChart({
  data,
  label,
  labels,
  width = 240,
  height = 110,
  color = "var(--ink-900)",
  gap = 8,
  highlightLast = true,
  format = formatNumber,
}: BarChartProps) {
  if (data.length === 0) return <EmptyChart label={label} />;

  const max = Math.max(...data, 0) || 1;
  const n = data.length;
  const axis = labels ? 18 : 2;
  const barWidth = (width - gap * (n - 1)) / n;

  return (
    <figure className="m-0 min-w-0">
      <svg
        role="img"
        aria-label={`${label}, ${n} valeur${n > 1 ? "s" : ""}`}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="block h-auto max-w-full"
      >
        {data.map((v, i) => {
          const h = Math.max(2, (height - axis) * (Math.max(v, 0) / max));
          const x = i * (barWidth + gap);
          const last = i === n - 1;
          return (
            <g key={i}>
              <rect
                x={x}
                y={height - axis - h}
                width={barWidth}
                height={h}
                rx={3}
                fill={color}
                opacity={highlightLast && !last ? 0.3 : 1}
              />
              {labels && (
                <text
                  x={x + barWidth / 2}
                  y={height - 5}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight={700}
                  fill="var(--ink-500)"
                >
                  {labels[i]}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <ChartData
        caption={label}
        headers={["Période", "Valeur"]}
        rows={data.map((v, i) => [labels?.[i] ?? String(i + 1), format(v)])}
      />
    </figure>
  );
}
