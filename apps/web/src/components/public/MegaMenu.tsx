"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";

import { Icon } from "@/components/ds";
import { cx } from "@/lib/cx";

import { currentOf, type ResourceLink } from "./nav";

export type MegaMenuProps = {
  label: string;
  items: ResourceLink[];
  /** La rubrique est active (une de ses pages est affichée). */
  active: boolean;
  pathname: string | null;
};

/**
 * Menu déroulant « Ressources » (modèle « disclosure » de navigation) : bouton `aria-expanded`, ouverture au
 * clic, à Entrée, Espace ou ↓, flèches entre les entrées, `Échap` ferme et rend le focus au bouton, fermeture au
 * clic extérieur ou quand le focus sort. Jamais d'ouverture au seul survol.
 */
export function MegaMenu({ label, items, active, pathname }: MegaMenuProps) {
  const [open, setOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const links = useRef<Array<HTMLAnchorElement | null>>([]);

  useEffect(() => {
    if (open && focusIndex !== null) {
      links.current[focusIndex]?.focus();
    }
  }, [open, focusIndex]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const openAt = (index: number) => {
    setOpen(true);
    setFocusIndex(index);
  };

  const close = () => {
    setOpen(false);
    setFocusIndex(null);
    button.current?.focus();
  };

  const onButtonKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      openAt(0);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      openAt(items.length - 1);
    } else if (event.key === "Escape" && open) {
      close();
    }
  };

  const onPanelKeyDown = (event: KeyboardEvent) => {
    const current = links.current.findIndex((link) => link === document.activeElement);
    const moves: Record<string, number> = {
      ArrowDown: (current + 1) % items.length,
      ArrowUp: (current - 1 + items.length) % items.length,
      Home: 0,
      End: items.length - 1,
    };
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key in moves) {
      event.preventDefault();
      setFocusIndex(moves[event.key]);
      links.current[moves[event.key]]?.focus();
    }
  };

  const onBlur = (event: FocusEvent) => {
    if (!root.current?.contains(event.relatedTarget as Node | null)) {
      setOpen(false);
      setFocusIndex(null);
    }
  };

  return (
    <div ref={root} className="relative" onBlur={onBlur}>
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setOpen((o) => !o);
          setFocusIndex(null);
        }}
        onKeyDown={onButtonKeyDown}
        className={cx(
          "flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-sm text-sm font-extrabold",
          "focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-primary-500",
          active ? "text-primary-600" : "text-ink-700 hover:text-ink-900",
        )}
      >
        {label}
        <Icon
          name="chevron-down"
          size={14}
          strokeWidth={2.5}
          className={cx("transition-transform", open && "rotate-180")}
        />
      </button>
      <div
        id={panelId}
        hidden={!open}
        onKeyDown={onPanelKeyDown}
        className="absolute top-[calc(100%+14px)] left-0 z-30 w-80 rounded-lg border border-ink-100 bg-surface p-2.5 shadow-modal"
      >
        <ul className="grid grid-cols-2 gap-1">
          {items.map((item, index) => (
            <li key={item.href}>
              <Link
                ref={(node) => {
                  links.current[index] = node;
                }}
                href={item.href}
                aria-current={currentOf(item.href, pathname, pathname?.startsWith(`${item.href}/`) ?? false)}
                onClick={() => setOpen(false)}
                className={cx(
                  "flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[13px] font-extrabold text-ink-800",
                  "hover:bg-ink-50 focus-visible:outline-3 focus-visible:outline-primary-500",
                  "aria-[current]:bg-primary-50 aria-[current]:text-primary-700",
                )}
              >
                <span aria-hidden className="text-lg">
                  {item.emoji}
                </span>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
