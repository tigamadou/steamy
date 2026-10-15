"use client";

import type { CSSProperties } from "react";

import { cx } from "@/lib/cx";

import { ChoiceGroup, type ChoiceGroupProps } from "../ChoiceCard";
import { Icon } from "../Icon";

export type UserTypeOption = {
  value: string;
  emoji: string;
  title: string;
  description: string;
  /** Nom de jeton de couleur (ex. « primary-500 », « cat-ia »), fond de la carte sélectionnée. */
  color: string;
  /**
   * Texte de la carte sélectionnée : blanc sur un fond foncé (`dark`, défaut), `ink-900` sur un fond clair
   * (`light`) pour garder un contraste AA.
   */
  tone?: "dark" | "light";
};

export type UserTypeCardGroupProps = Omit<
  ChoiceGroupProps<UserTypeOption>,
  "optionClassName" | "optionStyle" | "renderOption" | "withDescription" | "listClassName"
>;

// Grandes cartes de profil (W03, WP04) : pastille emoji, titre, sous-titre et chevron.
export function UserTypeCardGroup(props: UserTypeCardGroupProps) {
  return (
    <ChoiceGroup
      {...props}
      withDescription
      listClassName="flex flex-col gap-3"
      optionStyle={(option) => ({ "--choix-couleur": `var(--${option.color})` }) as CSSProperties}
      optionClassName={(option, checked) =>
        cx(
          "flex items-center gap-4 rounded-[22px] border-2 p-5",
          checked
            ? "border-(--choix-couleur) bg-(--choix-couleur) shadow-[0_6px_0_color-mix(in_oklab,var(--choix-couleur),var(--ink-900)_30%)]"
            : "border-ink-100 bg-surface text-ink-900 shadow-[0_4px_0_var(--ink-100)] hover:bg-ink-50",
          checked && (option.tone === "light" ? "text-ink-900" : "text-white"),
        )
      }
      renderOption={(option, { checked, labelId, descriptionId }) => (
        <>
          <span
            aria-hidden
            className={cx(
              "flex size-16 shrink-0 items-center justify-center rounded-[18px] text-[32px] leading-none",
              checked ? "bg-white/20" : "bg-(--choix-couleur)",
            )}
          >
            {option.emoji}
          </span>
          <span className="min-w-0 flex-1">
            <span id={labelId} className="block text-[18px] leading-tight font-black">
              {option.title}
            </span>
            <span
              id={descriptionId}
              className={cx(
                "mt-1 block text-[13px] leading-[1.4] font-semibold",
                checked ? "opacity-90" : "text-ink-600",
              )}
            >
              {option.description}
            </span>
          </span>
          <Icon
            name="chevron-right"
            size={24}
            strokeWidth={2.5}
            className={cx("shrink-0", checked ? "text-current" : "text-ink-500")}
          />
        </>
      )}
    />
  );
}
