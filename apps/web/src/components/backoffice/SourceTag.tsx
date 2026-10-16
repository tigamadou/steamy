import { cx } from "@/lib/cx";

/** Source d'un KPI (légende de WAD02) : calcul automatique, saisie manuelle, ou donnée non collectée. */
export type KpiSource = "auto" | "manual" | "unavailable";

const SOURCES: Record<KpiSource, { label: string; description: string; className: string }> = {
  auto: {
    label: "Auto",
    description: "Calculé automatiquement depuis la plateforme",
    className: "border border-ink-900 text-ink-900",
  },
  manual: {
    label: "Manuel",
    description: "Saisi par le personnel avant soumission",
    className: "border border-ink-300 text-ink-600",
  },
  unavailable: {
    label: "Indisponible",
    description: "Donnée non collectée",
    className: "border border-dashed border-ink-300 italic text-ink-600",
  },
};

export const SOURCE_KINDS = Object.keys(SOURCES) as KpiSource[];

export function SourceTag({ source }: { source: KpiSource }) {
  const tag = SOURCES[source];
  return (
    <span
      title={tag.description}
      className={cx(
        "inline-flex items-center whitespace-nowrap rounded-md px-1.75 py-0.75 text-[10px] font-extrabold uppercase tracking-[.03em]",
        tag.className,
      )}
    >
      {tag.label}
      <span className="sr-only"> · {tag.description}</span>
    </span>
  );
}
