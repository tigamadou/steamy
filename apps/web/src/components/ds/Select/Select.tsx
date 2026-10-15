"use client";

import type { SelectHTMLAttributes } from "react";

import { cx } from "@/lib/cx";

import { controlBoxClasses, useFieldControl } from "../Field";
import { Icon } from "../Icon";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean;
};

// Liste native (accessibilité et clavier du navigateur), habillée comme les autres champs.
export function Select({ invalid, className, id, required, children, ...rest }: SelectProps) {
  const { invalid: isInvalid, ...a11y } = useFieldControl({ id, invalid, required, describedBy: rest["aria-describedby"] });
  return (
    <div className={controlBoxClasses(isInvalid, cx("relative h-14", className), "px-0")}>
      <select
        {...rest}
        {...a11y}
        className="h-full min-w-0 flex-1 cursor-pointer appearance-none bg-transparent pr-11 pl-4 font-bold text-ink-900 outline-none"
      >
        {children}
      </select>
      <Icon name="chevron-down" size={20} className="pointer-events-none absolute right-4 text-ink-600" />
    </div>
  );
}
