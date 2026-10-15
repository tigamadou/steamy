"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";

import { Icon } from "@/components/ds";
import type { PublicSection } from "@/lib/routes";

import { ABOUT_LINK, currentOf, MAIN_LINKS, RESOURCE_LINKS } from "./nav";
import { NavAccount } from "./NavAccount";

const FOCUSABLE = "a[href], button:not([disabled])";

export type MobileMenuProps = {
  section: PublicSection | null;
  pathname: string | null;
};

const linkClass =
  "block rounded-md px-3 py-3 text-base font-extrabold text-ink-800 hover:bg-ink-50 focus-visible:outline-3 focus-visible:outline-primary-500 aria-[current]:bg-primary-50 aria-[current]:text-primary-700";

/**
 * Navigation publique sur petit écran : tiroir modal (`Échap` ferme, le focus reste piégé dans le tiroir puis
 * revient au bouton « Menu »).
 */
export function MobileMenu({ section, pathname }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      drawer.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    }
  }, [open]);

  const close = () => {
    setOpen(false);
    toggle.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab") {
      return;
    }
    const focusables = Array.from(drawer.current!.querySelectorAll<HTMLElement>(FOCUSABLE));
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const item = (href: string, label: string, active: boolean) => (
    <li key={href}>
      <Link
        href={href}
        aria-current={currentOf(href, pathname, active)}
        onClick={() => setOpen(false)}
        className={linkClass}
      >
        {label}
      </Link>
    </li>
  );

  return (
    <>
      <button
        ref={toggle}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Menu"
        onClick={() => setOpen(true)}
        className="flex size-11 cursor-pointer items-center justify-center rounded-md text-ink-800 hover:bg-ink-50 focus-visible:outline-3 focus-visible:outline-primary-500"
      >
        <Icon name="menu" size={24} />
      </button>
      {/* Portail : le flou de l'en-tête (`backdrop-filter`) confinerait un élément `fixed` à l'en-tête. */}
      {open &&
        createPortal(
          <div className="fixed inset-0 z-40">
            <div aria-hidden className="absolute inset-0 bg-(--overlay-shadow)" onClick={() => setOpen(false)} />
            <div
              ref={drawer}
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              onKeyDown={onKeyDown}
              className="absolute inset-y-0 right-0 flex w-[min(320px,88vw)] flex-col gap-4 overflow-y-auto bg-surface p-4 shadow-modal"
            >
              <button
                type="button"
                aria-label="Fermer le menu"
                onClick={close}
                className="flex size-11 cursor-pointer items-center justify-center self-end rounded-md text-ink-800 hover:bg-ink-50 focus-visible:outline-3 focus-visible:outline-primary-500"
              >
                <Icon name="x" size={24} />
              </button>
              <nav aria-label="Navigation principale">
                <ul className="flex flex-col gap-0.5">
                  {MAIN_LINKS.map((link) => item(link.href, link.label, link.section === section))}
                </ul>
                <p className="mt-4 mb-1 px-3 text-xs font-black tracking-[0.08em] text-ink-600 uppercase">Ressources</p>
                <ul className="flex flex-col gap-0.5">
                  {RESOURCE_LINKS.map((link) =>
                    item(link.href, link.label, pathname?.startsWith(`${link.href}/`) ?? false),
                  )}
                </ul>
                <ul className="mt-4 flex flex-col gap-0.5">
                  {item(ABOUT_LINK.href, ABOUT_LINK.label, section === "about")}
                </ul>
              </nav>
              <div className="mt-auto border-t border-ink-100 pt-4">
                <NavAccount stacked />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
