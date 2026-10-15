"use client";

import type { TextareaHTMLAttributes } from "react";

import { cx } from "@/lib/cx";

import { controlBoxClasses, useFieldControl } from "../Field";
import { controlTextClasses } from "../Field/control";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
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
