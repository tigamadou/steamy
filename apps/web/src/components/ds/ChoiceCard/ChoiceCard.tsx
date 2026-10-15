"use client";

import { cx } from "@/lib/cx";

import { ChoiceGroup, type ChoiceGroupProps } from "./ChoiceGroup";

export type ChoiceCardOption = {
  value: string;
  /** Emoji décoratif au-dessus du libellé. */
  emoji?: string;
  label: string;
};

export type ChoiceCardGroupProps = Omit<
  ChoiceGroupProps<ChoiceCardOption>,
  "optionClassName" | "optionStyle" | "renderOption" | "withDescription" | "listClassName"
>;

// Cartes compactes en ligne (W12 genre) : sélection en primaire avec ombre « candy ».
export function ChoiceCardGroup(props: ChoiceCardGroupProps) {
  return (
    <ChoiceGroup
      {...props}
      listClassName="flex gap-2.5"
      optionClassName={(_, checked) =>
        cx(
          "flex min-h-11 flex-1 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 p-3.5 text-center text-[13px] font-extrabold",
          checked
            ? "border-primary-500 bg-primary-500 text-white shadow-[0_4px_0_var(--primary-700)]"
            : "border-ink-200 bg-surface text-ink-900 shadow-[0_4px_0_var(--ink-200)] hover:bg-ink-50",
        )
      }
      renderOption={(option, { labelId }) => (
        <>
          {option.emoji && (
            <span aria-hidden className="text-[28px] leading-none">
              {option.emoji}
            </span>
          )}
          <span id={labelId}>{option.label}</span>
        </>
      )}
    />
  );
}
