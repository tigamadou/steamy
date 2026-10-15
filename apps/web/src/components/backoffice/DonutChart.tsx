import { ChartData } from "./ChartData";
import { formatNumber } from "./styles";

export type DonutChartProps = {
  value: number;
  total: number;
  /** Nom accessible (ex. « Part de femmes parmi les nouveaux apprenants »). */
  label: string;
  /** Texte central ; le pourcentage par défaut. */
  display?: string;
  /** Légende sous le texte central. */
  caption?: string;
  size?: number;
  thickness?: number;
  color?: string;
  track?: string;
  format?: (value: number) => string;
};

/** Part d'un total (0 à 1), bornée ; total nul → 0. */
export function ratio(value: number, total: number): number {
  return total > 0 ? Math.max(0, Math.min(1, value / total)) : 0;
}

// Ratio (design/ds-charts.jsx) : cercle et `stroke-dasharray`, monochrome par défaut.
export function DonutChart({
  value,
  total,
  label,
  display,
  caption,
  size = 104,
  thickness = 13,
  color = "var(--ink-900)",
  track = "var(--ink-100)",
  format = formatNumber,
}: DonutChartProps) {
  const pct = ratio(value, total);
  const percent = `${Math.round(pct * 100)} %`;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const center = size / 2;

  return (
    <figure className="m-0">
      <svg
        role="img"
        aria-label={`${label} : ${percent}`}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="block"
      >
        <circle cx={center} cy={center} r={r} fill="none" stroke={track} strokeWidth={thickness} />
        <circle
          cx={center}
          cy={center}
          r={r}
          transform={`rotate(-90 ${center} ${center})`}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          strokeLinecap="round"
        />
        <text
          x={center}
          y={caption ? center - 4 : center}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={size * 0.24}
          fontWeight={900}
          fill="var(--ink-900)"
        >
          {display ?? percent}
        </text>
        {caption && (
          <text
            x={center}
            y={center + size * 0.16}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={10}
            fontWeight={700}
            fill="var(--ink-500)"
          >
            {caption}
          </text>
        )}
      </svg>
      <ChartData
        caption={label}
        headers={["Mesure", "Valeur"]}
        rows={[
          ["Valeur", format(value)],
          ["Total", format(total)],
          ["Part", percent],
        ]}
      />
    </figure>
  );
}
