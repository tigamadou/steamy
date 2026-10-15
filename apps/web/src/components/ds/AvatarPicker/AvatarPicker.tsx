"use client";

import type { CSSProperties, ReactNode } from "react";

import { cx } from "@/lib/cx";

import { ChoiceGroup } from "../ChoiceCard";
import { Icon } from "../Icon";

/** Avatar du référentiel `referentials/avatars/`. */
export type AvatarChoice = {
  id: number;
  code: string;
  label: string;
  emoji: string;
  /** Nom de jeton de couleur (ex. « cat-ia »). */
  color: string;
};

export type AvatarPickerProps = {
  legend: ReactNode;
  /** Légende réservée aux lecteurs d'écran (titre déjà affiché par l'écran). */
  legendHidden?: boolean;
  name: string;
  /** Avatars servis par l'API, dans l'ordre reçu. */
  avatars: readonly AvatarChoice[];
  /** Code de l'avatar choisi ; aucun par défaut. */
  value?: string;
  onChange?: (code: string) => void;
  required?: boolean;
  error?: ReactNode;
  className?: string;
};

type AvatarOption = AvatarChoice & { value: string };

// Grille radio des avatars (W14) : sélection marquée d'un double anneau ambre et d'une pastille ✓.
export function AvatarPicker({ avatars, value, ...rest }: AvatarPickerProps) {
  const options: AvatarOption[] = avatars.map((avatar) => ({ ...avatar, value: avatar.code }));
  return (
    <ChoiceGroup
      {...rest}
      options={options}
      value={value}
      listClassName="grid grid-cols-3 gap-3 sm:grid-cols-5"
      optionStyle={(option) => ({ "--avatar-couleur": `var(--${option.color})` }) as CSSProperties}
      optionClassName={(_, checked) =>
        cx(
          "flex aspect-square items-center justify-center rounded-[22px] bg-(--avatar-couleur)",
          checked && "shadow-[0_0_0_4px_var(--surface),0_0_0_8px_var(--amber-500)]",
        )
      }
      renderOption={(option, { checked, labelId }) => (
        <>
          <span id={labelId} className="sr-only">
            {option.label}
          </span>
          <span aria-hidden className="text-[56px] leading-none">
            {option.emoji}
          </span>
          {checked && (
            <span
              aria-hidden
              className="absolute top-1.5 right-1.5 flex size-5.5 items-center justify-center rounded-pill bg-amber-500 text-white"
            >
              <Icon name="check" size={14} strokeWidth={3.5} />
            </span>
          )}
        </>
      )}
    />
  );
}
