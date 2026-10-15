"use client";

import type { InputHTMLAttributes, ReactNode } from "react";

import { cx } from "@/lib/cx";

import { controlBoxClasses, useFieldControl } from "../Field";
import { controlTextClasses } from "../Field/control";
import { Icon, type IconName } from "../Icon";

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> & {
  icon?: IconName;
  /** Préfixe affiché dans le champ (ex. « F CFA », indicatif). */
  prefix?: ReactNode;
  /** Erreur hors `Field` ; dans un `Field`, c'est sa prop `error` qui compte. */
  invalid?: boolean;
  /** Classes du cadre. */
  className?: string;
};

export function Input({ icon, prefix, invalid, className, id, required, type = "text", ...rest }: InputProps) {
  const { invalid: isInvalid, ...a11y } = useFieldControl({ id, invalid, required, describedBy: rest["aria-describedby"] });
  return (
    <div className={controlBoxClasses(isInvalid, cx("h-14", className))}>
      {prefix && (
        <span className="flex items-center gap-1.5 border-r-2 border-ink-100 pr-2 font-extrabold text-ink-700">
          {prefix}
        </span>
      )}
      {icon && <Icon name={icon} size={20} className="text-ink-600" />}
      <input type={type} {...rest} {...a11y} className={controlTextClasses} />
    </div>
  );
}
