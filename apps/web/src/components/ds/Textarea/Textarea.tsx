"use client";

import type { ComponentProps } from "react";

import { cx } from "@/lib/cx";

import { controlBoxClasses, useFieldControl } from "../Field";
import { controlTextClasses } from "../Field/control";

// `ComponentProps` porte aussi `ref` (React 19) : le formulaire peut rendre le focus au champ.
export type TextareaProps = ComponentProps<"textarea"> & {
  invalid?: boolean;
};

export function Textarea({ invalid, className, id, required, rows = 5, ...rest }: TextareaProps) {
  const { invalid: isInvalid, ...a11y } = useFieldControl({ id, invalid, required, describedBy: rest["aria-describedby"] });
  return (
    <div className={controlBoxClasses(isInvalid, cx("py-3", className))}>
      <textarea rows={rows} {...rest} {...a11y} className={cx(controlTextClasses, "resize-y leading-6")} />
    </div>
  );
}
