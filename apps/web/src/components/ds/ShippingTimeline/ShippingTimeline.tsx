import type { ReactNode } from "react";

import { cx } from "@/lib/cx";

import { Icon } from "../Icon";

export type ShippingStepState = "done" | "current" | "todo";

export type ShippingStep = {
  label: string;
  /** Date, délai annoncé par la zone (API) ou « À venir ». */
  meta?: ReactNode;
  state: ShippingStepState;
};

export type ShippingTimelineProps = {
  steps: ShippingStep[];
  /** Nom accessible de la liste. */
  label?: string;
  className?: string;
};

const STATE_TEXT: Record<ShippingStepState, string> = { done: "terminée", current: "en cours", todo: "à venir" };

/**
 * Suivi de livraison (WK07, WPD07) : étapes ordonnées, issues du statut de livraison de l'API (`shippingStatus`) par
 * l'appelant. L'étape en cours porte `aria-current="step"` ; l'état de chaque étape est lu par les lecteurs d'écran.
 */
export function ShippingTimeline({ steps, label = "Suivi de livraison", className }: ShippingTimelineProps) {
  return (
    <ol aria-label={label} className={cx("flex flex-col", className)}>
      {steps.map((step, index) => {
        const last = index === steps.length - 1;
        return (
          <li key={step.label} aria-current={step.state === "current" ? "step" : undefined} className="flex gap-4">
            <div className="flex flex-col items-center">
              <span
                aria-hidden
                className={cx(
                  "flex size-8 shrink-0 items-center justify-center rounded-pill",
                  step.state === "done" && "bg-success-600 text-white",
                  step.state === "current" && "bg-primary-500",
                  step.state === "todo" && "bg-ink-100",
                )}
              >
                {step.state === "done" ? (
                  <Icon name="check" size={16} strokeWidth={3} />
                ) : (
                  <span className={cx("size-2.5 rounded-pill", step.state === "current" ? "bg-white" : "bg-ink-400")} />
                )}
              </span>
              {!last && (
                <span
                  aria-hidden
                  className={cx("min-h-7 w-[3px] flex-1", step.state === "done" ? "bg-success-600" : "bg-ink-100")}
                />
              )}
            </div>
            <div className={cx(!last && "pb-4.5")}>
              <p className={cx("text-[15px] font-black", step.state === "todo" ? "text-ink-500" : "text-ink-900")}>
                {step.label}
                <span className="sr-only"> : étape {STATE_TEXT[step.state]}</span>
              </p>
              {step.meta && <p className="mt-0.5 text-[13px] font-semibold text-ink-600">{step.meta}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
