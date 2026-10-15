import type { ReactNode } from "react";

import { cx } from "@/lib/cx";

import { Icon } from "../Icon";

export type AccordionProps = {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  /** Ouvert de force (ex. recherche dans une FAQ). */
  open?: boolean;
  className?: string;
};

// Volet repliable natif (`details`/`summary`) : clavier, lecteurs d'écran et recherche du navigateur
// fonctionnent sans JavaScript.
export function Accordion({ title, children, defaultOpen, open, className }: AccordionProps) {
  return (
    <details
      open={open ?? defaultOpen}
      className={cx("group rounded-lg border-2 border-ink-100 bg-surface open:border-primary-200", className)}
    >
      <summary
        className={cx(
          "flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg px-5 py-4 text-base font-extrabold text-ink-900",
          "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-500 [&::-webkit-details-marker]:hidden",
        )}
      >
        {title}
        <Icon
          name="chevron-down"
          size={20}
          className="text-ink-600 transition-transform group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <div className="px-5 pb-5 text-[15px] leading-relaxed font-semibold text-ink-700">{children}</div>
    </details>
  );
}
