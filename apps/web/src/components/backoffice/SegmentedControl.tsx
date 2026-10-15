"use client";

import { cx } from "@/lib/cx";

import { FOCUS } from "./styles";

export type SegmentOption = { id: string; label: string };

export type SegmentedControlProps = {
  options: Array<SegmentOption | string>;
  value: string;
  onChange: (id: string) => void;
  /** Nom du groupe (ex. « Période »). */
  label: string;
};

// Bascule (design/ds-charts.jsx) : boutons `aria-pressed` dans un groupe nommé.
export function SegmentedControl({ options, value, onChange, label }: SegmentedControlProps) {
  const items = options.map((option) => (typeof option === "string" ? { id: option, label: option } : option));
  return (
    <div role="group" aria-label={label} className="inline-flex gap-0.5 rounded-[10px] bg-ink-100 p-0.75">
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(item.id)}
            className={cx(
              "cursor-pointer whitespace-nowrap rounded-lg px-3.5 py-1.75 text-xs font-extrabold transition-colors",
              FOCUS,
              active ? "bg-surface text-ink-900 shadow-pop-sm" : "text-ink-600 hover:text-ink-900",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
