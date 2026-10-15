import { cx } from "@/lib/cx";

/** Cadre commun aux champs (bordure, focus primaire avec halo, état d'erreur). */
export function controlBoxClasses(invalid: boolean, className?: string, padding = "px-4") {
  return cx(
    padding,
    "flex items-center gap-2.5 rounded-[14px] border-2 bg-surface text-base text-ink-900 transition-[border-color,box-shadow]",
    "focus-within:border-primary-500 focus-within:shadow-[0_0_0_4px_var(--primary-100)]",
    invalid ? "border-error-500 shadow-[0_0_0_4px_var(--error-100)]" : "border-ink-200",
    className,
  );
}

/** Texte saisi et indication (placeholder en `--ink-600` : `--ink-400` est interdit pour du texte). */
export const controlTextClasses =
  "min-w-0 flex-1 bg-transparent font-bold text-ink-900 outline-none placeholder:font-semibold placeholder:text-ink-600";
