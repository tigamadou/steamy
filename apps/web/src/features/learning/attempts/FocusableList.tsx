"use client";

import type { ReactNode } from "react";

import { useFocusOnChange } from "@/lib/use-focus-on-change";

/** Liste qui reçoit le focus quand la page ou le filtre change (`changeKey`), rendue côté client autour des lignes. */
export function FocusableList({ changeKey, label, children }: { changeKey: string; label: string; children: ReactNode }) {
  const list = useFocusOnChange<HTMLUListElement>(label, changeKey);
  return (
    <ul ref={list} tabIndex={-1} aria-label={label} className="m-0 flex list-none flex-col gap-2.5 p-0 outline-none">
      {children}
    </ul>
  );
}
