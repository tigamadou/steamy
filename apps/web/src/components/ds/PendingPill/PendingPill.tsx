import { cx } from "@/lib/cx";

export type PendingPillProps = {
  /** Texte de l'état, annoncé à chaque changement (`aria-live`). */
  label: string;
  /** `pending` : points animés (attente d'un tiers, SPEC-TECHNIQUE §6) ; `done` : état réglé. */
  status?: "pending" | "done";
  className?: string;
};

// Pastille d'attente d'un tiers (W07 : accord du parent). Animation coupée sous `prefers-reduced-motion`.
export function PendingPill({ label, status = "pending", className }: PendingPillProps) {
  return (
    <p
      role="status"
      className={cx(
        "inline-flex items-center gap-2.5 rounded-pill px-4 py-2 text-sm font-extrabold",
        status === "pending" ? "bg-amber-100 text-amber-700" : "bg-success-100 text-success-800",
        className,
      )}
    >
      {status === "pending" && (
        <span aria-hidden className="inline-flex gap-1">
          <span className="size-1.5 animate-bounce-dot rounded-pill bg-current motion-reduce:animate-none" />
          <span className="size-1.5 animate-bounce-dot rounded-pill bg-current [animation-delay:150ms] motion-reduce:animate-none" />
          <span className="size-1.5 animate-bounce-dot rounded-pill bg-current [animation-delay:300ms] motion-reduce:animate-none" />
        </span>
      )}
      {label}
    </p>
  );
}
