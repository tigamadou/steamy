// ds-charts.jsx - Primitives data-viz du Design System (transverses).
// SVG inline fait main (aucune librairie : le repo n'a pas de build).
// Monochrome par défaut (tokens --ink-*) ; la couleur se passe par prop.
// Charger APRÈS ds-complex.jsx et AVANT les screens qui les consomment.
// Expose : Sparkline, BarChart, DonutChart, StatCard, DataTable, SegmentedControl.

const dsCharts_styles = `
/* ── StatCard ─────────────────────────────────────── */
.dc-statcard {
  background: #fff;
  border: 1px solid var(--ink-100);
  border-radius: 14px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}
.dc-statcard__top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.dc-statcard__label {
  font: 800 11px var(--font-sans);
  color: var(--ink-500);
  text-transform: uppercase;
  letter-spacing: .05em;
}
.dc-statcard__icon { color: var(--ink-400); display: flex; flex-shrink: 0; }
.dc-statcard__row { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; }
.dc-statcard__value { font: 900 28px var(--font-sans); color: var(--ink-900); line-height: 1; letter-spacing: -.02em; }
.dc-statcard__sub { font: 600 12px var(--font-sans); color: var(--ink-500); margin-top: 5px; }
.dc-statcard__delta { font: 800 12px var(--font-sans); display: flex; align-items: center; gap: 4px; }

/* ── DataTable ────────────────────────────────────── */
.dc-table { border: 1px solid var(--ink-100); border-radius: 14px; overflow: hidden; background: #fff; }
.dc-table__head {
  display: grid;
  gap: 14px;
  padding: 12px 16px;
  background: var(--ink-50);
  border-bottom: 1px solid var(--ink-100);
}
.dc-table__th {
  font: 800 11px var(--font-sans);
  color: var(--ink-500);
  text-transform: uppercase;
  letter-spacing: .05em;
  min-width: 0;
}
.dc-table__body { display: flex; flex-direction: column; }
.dc-table__row {
  display: grid;
  gap: 14px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--ink-100);
  align-items: center;
  transition: background .12s;
}
.dc-table__row:last-child { border-bottom: 0; }
.dc-table__row:nth-child(even) { background: var(--ink-50); }
.dc-table__row.is-clickable { cursor: pointer; }
.dc-table__row.is-clickable:hover { background: var(--ink-100); }
.dc-table--dense .dc-table__row { padding: 9px 16px; }
.dc-table__td { font: 600 13px var(--font-sans); color: var(--ink-800); min-width: 0; }
.dc-table__td b, .dc-table__td strong { font-weight: 800; color: var(--ink-900); }
.dc-table__empty { padding: 36px; text-align: center; font: 600 14px var(--font-sans); color: var(--ink-400); }

/* ── SegmentedControl ─────────────────────────────── */
.dc-seg { display: inline-flex; background: var(--ink-100); border-radius: 10px; padding: 3px; gap: 2px; }
.dc-seg__btn {
  border: 0;
  background: transparent;
  padding: 7px 14px;
  border-radius: 8px;
  font: 800 12px var(--font-sans);
  color: var(--ink-600);
  cursor: pointer;
  transition: all .12s;
  white-space: nowrap;
}
.dc-seg__btn:hover { color: var(--ink-900); }
.dc-seg__btn.is-active { background: #fff; color: var(--ink-900); box-shadow: 0 1px 3px rgba(15,13,38,.14); }
`;

if (!document.getElementById("ds-charts-styles")) {
  const s = document.createElement("style");
  s.id = "ds-charts-styles";
  s.textContent = dsCharts_styles;
  document.head.appendChild(s);
}

// ════════════════════════════════════════════════════════
// Sparkline · tendance compacte (SVG polyline)
// ════════════════════════════════════════════════════════
function Sparkline({
  data = [],
  width = 96,
  height = 28,
  color = "var(--ink-900)",
  strokeWidth = 2,
  area = false,
}) {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const stepX = data.length > 1 ? width / (data.length - 1) : 0;
  const pad = strokeWidth + 1;
  const y = (v) => pad + (height - pad * 2) * (1 - (v - min) / span);
  const pts = data
    .map((v, i) => `${(i * stepX).toFixed(1)},${y(v).toFixed(1)}`)
    .join(" ");
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block", overflow: "visible" }}
    >
      {area && (
        <polygon
          points={`0,${height} ${pts} ${width},${height}`}
          style={{ fill: color, opacity: 0.08 }}
        />
      )}
      <polyline
        points={pts}
        style={{
          fill: "none",
          stroke: color,
          strokeWidth,
          strokeLinecap: "round",
          strokeLinejoin: "round",
        }}
      />
    </svg>
  );
}

// ════════════════════════════════════════════════════════
// BarChart · valeurs par période (SVG rects verticaux)
// ════════════════════════════════════════════════════════
function BarChart({
  data = [],
  width = 240,
  height = 110,
  color = "var(--ink-900)",
  gap = 8,
  labels,
  highlightLast = true,
}) {
  if (!data.length) return null;
  const max = Math.max(...data) || 1;
  const n = data.length;
  const axis = labels ? 18 : 2;
  const bw = (width - gap * (n - 1)) / n;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block", maxWidth: "100%" }}
    >
      {data.map((v, i) => {
        const h = Math.max(2, (height - axis) * (v / max));
        const x = i * (bw + gap);
        const yy = height - axis - h;
        const last = i === n - 1;
        return (
          <g key={i}>
            <rect
              x={x}
              y={yy}
              width={bw}
              height={h}
              rx={3}
              style={{ fill: color, opacity: highlightLast && !last ? 0.3 : 1 }}
            />
            {labels && (
              <text
                x={x + bw / 2}
                y={height - 5}
                textAnchor="middle"
                style={{ fontSize: 9, fontWeight: 700, fill: "var(--ink-400)" }}
              >
                {labels[i]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ════════════════════════════════════════════════════════
// DonutChart · ratio (cercle + stroke-dasharray)
// ════════════════════════════════════════════════════════
function DonutChart({
  value = 0,
  total = 100,
  size = 104,
  thickness = 13,
  color = "var(--ink-900)",
  track = "var(--ink-100)",
  label,
  caption,
}) {
  const pct = total ? Math.max(0, Math.min(1, value / total)) : 0;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: "block" }}
    >
      <circle
        cx={cx}
        cy={cy}
        r={r}
        style={{ fill: "none", stroke: track, strokeWidth: thickness }}
      />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{
          fill: "none",
          stroke: color,
          strokeWidth: thickness,
          strokeDasharray: c,
          strokeDashoffset: c * (1 - pct),
          strokeLinecap: "round",
          transition: "stroke-dashoffset .4s var(--ease-out)",
        }}
      />
      <text
        x={cx}
        y={caption ? cy - 4 : cy}
        textAnchor="middle"
        dominantBaseline="central"
        style={{
          fontSize: size * 0.24,
          fontWeight: 900,
          fill: "var(--ink-900)",
        }}
      >
        {label != null ? label : `${Math.round(pct * 100)}%`}
      </text>
      {caption && (
        <text
          x={cx}
          y={cy + size * 0.16}
          textAnchor="middle"
          dominantBaseline="central"
          style={{ fontSize: 10, fontWeight: 700, fill: "var(--ink-500)" }}
        >
          {caption}
        </text>
      )}
    </svg>
  );
}

// ════════════════════════════════════════════════════════
// StatCard · grand chiffre + delta + sparkline
// ════════════════════════════════════════════════════════
function StatCard({
  label,
  value,
  sub,
  delta,
  deltaTone = "neutral",
  spark,
  sparkColor = "var(--ink-900)",
  icon,
}) {
  const tones = {
    success: "var(--success-600)",
    error: "var(--error-600)",
    neutral: "var(--ink-500)",
  };
  const arrow = { success: "▲", error: "▼", neutral: "•" };
  return (
    <div className="dc-statcard">
      <div className="dc-statcard__top">
        <span className="dc-statcard__label">{label}</span>
        {icon && <span className="dc-statcard__icon">{icon}</span>}
      </div>
      <div className="dc-statcard__row">
        <div style={{ minWidth: 0 }}>
          <div className="dc-statcard__value">{value}</div>
          {sub && <div className="dc-statcard__sub">{sub}</div>}
        </div>
        {spark && spark.length > 0 && (
          <Sparkline data={spark} color={sparkColor} width={84} height={32} />
        )}
      </div>
      {delta != null && (
        <div className="dc-statcard__delta" style={{ color: tones[deltaTone] }}>
          {arrow[deltaTone]} {delta}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// DataTable · tableau de données (CSS grid, zebra, slot JSX)
// columns: [{ key, label, align?, width? }]  ·  rows: objets indexés par key
// ════════════════════════════════════════════════════════
function DataTable({
  columns = [],
  rows = [],
  dense = false,
  onRowClick,
  empty = "Aucune donnée.",
}) {
  const grid = columns.map((c) => c.width || "1fr").join(" ");
  return (
    <div className={["dc-table", dense && "dc-table--dense"].filter(Boolean).join(" ")}>
      <div className="dc-table__head" style={{ gridTemplateColumns: grid }}>
        {columns.map((c) => (
          <div
            key={c.key}
            className="dc-table__th"
            style={{ textAlign: c.align || "left" }}
          >
            {c.label}
          </div>
        ))}
      </div>
      <div className="dc-table__body">
        {rows.length === 0 && <div className="dc-table__empty">{empty}</div>}
        {rows.map((r, i) => (
          <div
            key={i}
            className={["dc-table__row", onRowClick && "is-clickable"]
              .filter(Boolean)
              .join(" ")}
            style={{ gridTemplateColumns: grid }}
            onClick={onRowClick ? () => onRowClick(r, i) : undefined}
          >
            {columns.map((c) => (
              <div
                key={c.key}
                className="dc-table__td"
                style={{ textAlign: c.align || "left" }}
              >
                {r[c.key]}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// SegmentedControl · bascule (période, vue…)
// options: [{ id, label }] ou ["a","b"]
// ════════════════════════════════════════════════════════
function SegmentedControl({ options = [], value, onChange }) {
  const opts = options.map((o) =>
    typeof o === "string" ? { id: o, label: o } : o,
  );
  return (
    <div className="dc-seg">
      {opts.map((o) => (
        <button
          key={o.id}
          className={["dc-seg__btn", value === o.id && "is-active"]
            .filter(Boolean)
            .join(" ")}
          onClick={() => onChange && onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

window.Sparkline = Sparkline;
window.BarChart = BarChart;
window.DonutChart = DonutChart;
window.StatCard = StatCard;
window.DataTable = DataTable;
window.SegmentedControl = SegmentedControl;
