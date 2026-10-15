"use client";

import Link from "next/link";
import { useId, type ReactNode } from "react";

import { cx } from "@/lib/cx";

import { Icon } from "../Icon";
import { Toggle } from "../Toggle";

type Common = {
  label: ReactNode;
  description?: ReactNode;
  className?: string;
};

type ToggleRow = Common & {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  href?: undefined;
  value?: undefined;
};

type LinkRow = Common & {
  /** Ligne de navigation (hub de paramètres) : toute la ligne est un lien. */
  href: string;
  /** Valeur actuelle, affichée à droite (ex. l'identifiant). */
  value?: ReactNode;
  checked?: undefined;
};

type ReadOnlyRow = Common & {
  /** Ligne en lecture seule (ex. l'identifiant, non modifiable, C12). */
  value: ReactNode;
  href?: undefined;
  checked?: undefined;
};

export type SettingsRowProps = ToggleRow | LinkRow | ReadOnlyRow;

const ROW = "flex items-center justify-between gap-4 rounded-lg border border-ink-100 bg-surface px-5 py-4";

// Ligne de paramètres (design/screens-dashboard-web.jsx, `.settings-row`) : interrupteur, lien ou valeur en lecture.
export function SettingsRow(props: SettingsRowProps) {
  const id = useId();
  const { label, description, className } = props;
  const text = (
    <div className="min-w-0 flex-1">
      <div id={`${id}-libelle`} className="text-sm font-extrabold text-ink-900">
        {label}
      </div>
      {description && (
        <div id={`${id}-description`} className="mt-0.5 text-xs leading-normal font-semibold text-ink-600">
          {description}
        </div>
      )}
    </div>
  );

  if (props.href !== undefined) {
    return (
      <Link
        href={props.href}
        className={cx(
          ROW,
          "transition-colors hover:border-primary-200 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-500",
          className,
        )}
      >
        {text}
        {props.value !== undefined && <span className="truncate text-sm font-bold text-ink-600">{props.value}</span>}
        <Icon name="chevron-right" size={18} className="text-ink-400" />
      </Link>
    );
  }

  if (props.checked === undefined) {
    return (
      <div className={cx(ROW, className)}>
        {text}
        <span className="truncate text-sm font-bold text-ink-700">{props.value}</span>
      </div>
    );
  }

  return (
    <div className={cx(ROW, className)}>
      {text}
      <Toggle
        checked={props.checked}
        onChange={props.onChange}
        disabled={props.disabled}
        aria-labelledby={`${id}-libelle`}
        aria-describedby={description ? `${id}-description` : undefined}
      />
    </div>
  );
}
