import { cx } from "@/lib/cx";

export type LoaderProps = {
  kind?: "dots" | "spin";
  /** Message toujours affiché (jamais de spinner nu, SPEC-TECHNIQUE §6). */
  label: string;
  /** Animation au-dessus d'un message mis en avant (attente longue plein écran, WX03). */
  stacked?: boolean;
  className?: string;
  /** `ink` : variante monochrome du back-office (animation en encre). */
  tone?: "brand" | "ink";
};

const DOTS = {
  brand: ["bg-primary-500", "bg-success-500", "bg-amber-500"],
  ink: ["bg-ink-900", "bg-ink-600", "bg-ink-400"],
} as const;

export function Loader({ kind = "dots", label, stacked, className, tone = "brand" }: LoaderProps) {
  const [first, second, third] = DOTS[tone];
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
          className={cx(
            "size-6 shrink-0 animate-spin rounded-full border-3 motion-reduce:animate-none",
            tone === "ink" ? "border-ink-100 border-t-ink-900" : "border-primary-100 border-t-primary-500",
          )}
        />
      ) : (
        <span aria-hidden className="inline-flex gap-1.5">
          <span className={cx("size-2 animate-bounce-dot rounded-pill motion-reduce:animate-none", first)} />
          <span className={cx("size-2 animate-bounce-dot rounded-pill [animation-delay:150ms] motion-reduce:animate-none", second)} />
          <span className={cx("size-2 animate-bounce-dot rounded-pill [animation-delay:300ms] motion-reduce:animate-none", third)} />
        </span>
      )}
      <span>{label}</span>
    </div>
  );
}
