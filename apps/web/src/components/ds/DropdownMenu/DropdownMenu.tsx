"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { cx } from "@/lib/cx";

import { Icon } from "../Icon";

export type DropdownItem = {
  id: string;
  label: string;
  /** Choix adressable par URL (filtre, tri) : chaque option est un vrai lien. */
  href: string;
  selected?: boolean;
};

export type DropdownMenuProps = {
  /** Nom du réglage (« Difficulté », « Prix », « Trier par »). */
  label: string;
  items: DropdownItem[];
  /** `plain` : bouton sans bordure (tri du bandeau). */
  variant?: "outline" | "plain";
  /** Bord du bouton auquel le menu s'aligne. */
  align?: "start" | "end";
  className?: string;
};

// Bouton de liste déroulante et son menu (design/screens-catalog-web.jsx, `DropdownButton` / `DropdownMenu`) :
// motif « menu button » de l'ARIA APG, options `menuitemradio`, flèches, Début/Fin, Échap rend le focus au bouton.
export function DropdownMenu({ label, items, variant = "outline", align = "start", className }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const options = useRef<Array<HTMLAnchorElement | null>>([]);
  const current = items.find((item) => item.selected) ?? items[0];

  // À l'ouverture, le focus va sur l'option choisie ; un clic ailleurs referme le menu.
  useEffect(() => {
    if (!open) return;
    const selected = Math.max(
      0,
      items.findIndex((item) => item.selected),
    );
    options.current[selected]?.focus();
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open, items]);

  const close = () => {
    setOpen(false);
    button.current?.focus();
  };

  const onMenuKey = (event: KeyboardEvent<HTMLUListElement>) => {
    const index = options.current.indexOf(document.activeElement as HTMLAnchorElement);
    const last = items.length - 1;
    const moves: Record<string, number> = {
      ArrowDown: index >= last ? 0 : index + 1,
      ArrowUp: index <= 0 ? last : index - 1,
      Home: 0,
      End: last,
    };
    if (event.key in moves) {
      event.preventDefault();
      options.current[moves[event.key]]?.focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  const onButtonKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
    }
  };

  return (
    <div ref={root} className={cx("relative", className)}>
      <button
        ref={button}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={onButtonKey}
        className={cx(
          "inline-flex h-10 cursor-pointer items-center gap-2 rounded-md px-3.5 text-[13px] font-extrabold text-ink-900 transition-[border-color,box-shadow]",
          "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-500",
          variant === "outline" && "border-2 border-ink-200 bg-surface hover:border-primary-300",
          variant === "outline" && open && "border-primary-500 shadow-[0_0_0_4px_var(--primary-100)]",
        )}
      >
        <span className="font-bold text-ink-600">{label} ·</span>
        <span>{current?.label}</span>
        <Icon
          name="chevron-down"
          size={14}
          className={cx("text-ink-600 transition-transform motion-reduce:transition-none", open && "rotate-180")}
        />
      </button>
      {open && (
        <ul
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKey}
          className={cx(
            "absolute top-full z-30 mt-1.5 flex min-w-55 flex-col rounded-[14px] border border-ink-100 bg-surface p-1.5 shadow-modal",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {items.map((item, index) => (
            <li key={item.id} role="none">
              <Link
                ref={(node) => {
                  options.current[index] = node;
                }}
                href={item.href}
                role="menuitemradio"
                aria-checked={!!item.selected}
                tabIndex={-1}
                scroll={false}
                onClick={() => setOpen(false)}
                className={cx(
                  "flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-sm font-bold text-ink-900 outline-none",
                  "hover:bg-ink-100 focus-visible:bg-ink-100 focus-visible:outline-2 focus-visible:outline-primary-500",
                  item.selected && "bg-primary-50 text-primary-700",
                )}
              >
                <span
                  aria-hidden
                  className={cx(
                    "relative size-4.5 shrink-0 rounded-pill border-2",
                    item.selected
                      ? "border-primary-500 after:absolute after:inset-0.5 after:rounded-pill after:bg-primary-500"
                      : "border-ink-300",
                  )}
                />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
