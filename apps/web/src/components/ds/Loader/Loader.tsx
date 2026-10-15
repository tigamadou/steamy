import { cx } from "@/lib/cx";

export type LoaderProps = {
  kind?: "dots" | "spin";
  /** Message toujours affiché (jamais de spinner nu, SPEC-TECHNIQUE §6). */
  label: string;
  /** Animation au-dessus d'un message mis en avant (attente longue plein écran, WX03). */
  stacked?: boolean;
  className?: string;
};

export function Loader({ kind = "dots", label, stacked, className }: LoaderProps) {
  return (
    <div
      role="status"
      className={cx(
        "inline-flex items-center",
        stacked ? "flex-col gap-5 text-[22px] font-black text-ink-900" : "gap-3 text-sm font-bold text-ink-600",
        className,
      )}
    >
      {kind === "spin" ? (
        <span
          aria-hidden
          className="size-6 shrink-0 animate-spin rounded-full border-3 border-primary-100 border-t-primary-500 motion-reduce:animate-none"
        />
      ) : (
        <span aria-hidden className="inline-flex gap-1.5">
          <span className="size-2 animate-bounce-dot rounded-pill bg-primary-500 motion-reduce:animate-none" />
          <span className="size-2 animate-bounce-dot rounded-pill bg-success-500 [animation-delay:150ms] motion-reduce:animate-none" />
          <span className="size-2 animate-bounce-dot rounded-pill bg-amber-500 [animation-delay:300ms] motion-reduce:animate-none" />
        </span>
      )}
      <span>{label}</span>
    </div>
  );
}
