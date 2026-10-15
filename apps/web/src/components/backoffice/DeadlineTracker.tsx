import { Icon } from "@/components/ds/Icon";
import { cx } from "@/lib/cx";

export type DeadlineStep = { label: string; date: string; state: "done" | "current" | "todo" };

const STATE_TEXT = { done: "terminée", current: "en cours", todo: "à venir" } as const;

// Échéances du rapport trimestriel (WAD01, WAD04) : étapes reliées, la courante mise en avant.
export function DeadlineTracker({ steps, label }: { steps: DeadlineStep[]; label: string }) {
  if (steps.length === 0) {
    return <p className="m-0 text-sm font-semibold text-ink-500">Aucune échéance.</p>;
  }
  return (
    <ol aria-label={label} className="m-0 flex list-none items-start p-0">
      {steps.map((step, i) => (
        <li
          key={`${step.label}-${i}`}
          aria-current={step.state === "current" ? "step" : undefined}
          className={cx(
            "relative flex flex-1 flex-col items-center text-center",
            i < steps.length - 1 &&
              "after:absolute after:top-2.75 after:left-1/2 after:h-0.5 after:w-full after:content-['']",
            i < steps.length - 1 && (step.state === "done" ? "after:bg-ink-900" : "after:bg-ink-200"),
          )}
        >
          <span
            aria-hidden
            className={cx(
              "relative z-1 flex size-6 items-center justify-center rounded-full border-2 text-[10px] font-black",
              step.state === "done" && "border-ink-900 bg-ink-900 text-surface",
              step.state === "current" && "border-ink-900 bg-surface text-ink-900 shadow-[0_0_0_4px_var(--ink-100)]",
              step.state === "todo" && "border-ink-300 bg-surface text-ink-500",
            )}
          >
            {step.state === "done" ? <Icon name="check" size={13} strokeWidth={3} /> : i + 1}
          </span>
          <span className="mt-2 text-xs font-extrabold text-ink-800">{step.label}</span>
          <span className="mt-0.5 text-[11px] font-bold text-ink-500">{step.date}</span>
          <span className="sr-only">, {STATE_TEXT[step.state]}</span>
        </li>
      ))}
    </ol>
  );
}
