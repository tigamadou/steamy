import type { ReactNode } from "react";

import { cx } from "@/lib/cx";

import { Sparkline } from "./Sparkline";

export type DeltaTone = "success" | "error" | "neutral";

const DELTA = {
  success: { className: "text-success-700", arrow: "▲", text: "En hausse" },
  error: { className: "text-error-600", arrow: "▼", text: "En baisse" },
  neutral: { className: "text-ink-600", arrow: "•", text: "Stable" },
} as const;

export type StatCardProps = {
  label: string;
  /** Valeur déjà formatée ; absente → « — ». */
  value?: ReactNode;
  sub?: ReactNode;
  /** Variation déjà formatée (ex. « +12 % vs décembre »). */
  delta?: string;
  deltaTone?: DeltaTone;
  /** Série de la tendance (sparkline), omise si vide. */
  spark?: number[];
  sparkColor?: string;
  icon?: ReactNode;
};

// Grand chiffre + variation + tendance (design/ds-charts.jsx).
export function StatCard({ label, value, sub, delta, deltaTone = "neutral", spark, sparkColor, icon }: StatCardProps) {
  const tone = DELTA[deltaTone];
  return (
    <section
      aria-label={label}
      className="flex min-w-0 flex-col gap-2.5 rounded-[14px] border border-ink-100 bg-surface px-4.5 py-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="m-0 text-[11px] font-extrabold uppercase tracking-[.05em] text-ink-600">{label}</h3>
        {icon && (
          <span aria-hidden className="flex shrink-0 text-ink-600">
            {icon}
          </span>
        )}
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0 text-[28px] font-black leading-none tracking-[-.02em] text-ink-900">{value ?? "—"}</p>
          {sub && <p className="m-0 mt-1.25 text-xs font-semibold text-ink-600">{sub}</p>}
        </div>
        {spark && spark.length > 0 && (
          <Sparkline data={spark} label={`Tendance · ${label}`} color={sparkColor} width={84} height={32} />
        )}
      </div>
      {delta && (
        <p className={cx("m-0 flex items-center gap-1 text-xs font-extrabold", tone.className)}>
          <span aria-hidden>{tone.arrow}</span>
          <span className="sr-only">{tone.text} : </span>
          {delta}
        </p>
      )}
    </section>
  );
}
