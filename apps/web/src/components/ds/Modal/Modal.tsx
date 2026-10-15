"use client";

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { cx } from "@/lib/cx";

import { Icon } from "../Icon";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export type ModalProps = {
  open: boolean;
  /** Fermeture demandée (Échap, clic sur le fond, bouton de fermeture). */
  onClose: () => void;
  title: ReactNode;
  /** Emoji décoratif au-dessus du titre. */
  icon?: string;
  /** Corps du message (décrit la boîte). */
  children: ReactNode;
  /** Boutons fournis par l'appelant. */
  actions?: ReactNode;
  /** `danger` : accent rouge (confirmation d'une action destructrice). */
  variant?: "default" | "danger";
  /** Libellé accessible du bouton de fermeture. */
  closeLabel?: string;
  className?: string;
};

function focusables(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
}

// Boîte de dialogue modale (design/ds-complex.jsx) rendue dans un portail, focus piégé tant qu'elle est ouverte.
export function Modal(props: ModalProps) {
  if (!props.open) return null;
  return createPortal(<ModalBox {...props} />, document.body);
}

function ModalBox({
  onClose,
  title,
  icon,
  children,
  actions,
  variant = "default",
  closeLabel = "Fermer",
  className,
}: ModalProps) {
  const baseId = `modale-${useId()}`;
  const boxRef = useRef<HTMLDivElement>(null);
  const danger = variant === "danger";

  // Focus initial, blocage du défilement, focus rendu à la fermeture.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    // Le bouton de fermeture garantit au moins un élément focalisable.
    focusables(boxRef.current as HTMLDivElement)[0].focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      previous.focus();
    };
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const items = focusables(event.currentTarget);
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === event.currentTarget)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/60 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${baseId}-titre`}
        aria-describedby={`${baseId}-corps`}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={cx(
          "relative flex max-h-full w-full max-w-[400px] flex-col items-center overflow-y-auto rounded-2xl bg-surface p-7 text-center shadow-modal outline-none",
          className,
        )}
      >
        <button
          type="button"
          aria-label={closeLabel}
          onClick={onClose}
          className="absolute top-2 right-2 flex size-11 cursor-pointer items-center justify-center rounded-pill text-ink-600 hover:bg-ink-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
        >
          <Icon name="x" size={20} strokeWidth={2.5} />
        </button>
        {icon && (
          <span
            aria-hidden
            className={cx(
              "mb-4 flex size-18 items-center justify-center rounded-pill text-[36px] leading-none",
              danger ? "bg-error-50" : "bg-primary-50",
            )}
          >
            {icon}
          </span>
        )}
        <h2
          id={`${baseId}-titre`}
          className={cx("text-[22px] leading-tight font-black", danger ? "text-error-700" : "text-ink-900")}
        >
          {title}
        </h2>
        <div id={`${baseId}-corps`} className="mt-2 text-[15px] leading-normal font-semibold text-ink-600">
          {children}
        </div>
        {actions && <div className="mt-6 flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-center">{actions}</div>}
      </div>
    </div>
  );
}
