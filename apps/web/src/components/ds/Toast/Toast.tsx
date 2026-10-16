"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { cx } from "@/lib/cx";

import { Icon, type IconName } from "../Icon";

const TONES = {
  success: { icon: "check", className: "bg-success-500 text-ink-900" },
  error: { icon: "x", className: "bg-error-600 text-white" },
  warning: { icon: "alert", className: "bg-amber-500 text-ink-900" },
  info: { icon: "bell", className: "bg-info-700 text-white" },
} as const satisfies Record<string, { icon: IconName; className: string }>;

export type ToastTone = keyof typeof TONES;

export type ToastProps = {
  tone?: ToastTone;
  title: ReactNode;
  /** Action secondaire (ex. un `Button` « Annuler »). */
  action?: ReactNode;
  /** Affiche le bouton de fermeture. */
  onClose?: () => void;
  closeLabel?: string;
  /** Survol ou focus dans le toast (`true`), puis sortie (`false`) : permet de suspendre sa disparition (WCAG 2.2.1). */
  onHoldChange?: (held: boolean) => void;
  className?: string;
};

const subscribe = () => () => {};

// Notification éphémère, rendue dans un portail en `position: fixed`, annoncée poliment (`aria-live`).
export function Toast({
  tone = "success",
  title,
  action,
  onClose,
  closeLabel = "Fermer",
  className,
  onHoldChange,
}: ToastProps) {
  // Le portail n'existe qu'une fois dans le navigateur (pas de `document` au rendu serveur)
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  if (!mounted) return null;

  const { icon, className: toneClasses } = TONES[tone];
  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-4 z-50 flex justify-center sm:inset-x-auto sm:right-6 sm:bottom-6"
    >
      <div
        className={cx(
          "flex w-full max-w-sm items-center gap-3 rounded-lg bg-ink-900 px-4.5 py-3.5 font-bold text-white shadow-modal",
          className,
        )}
        onPointerEnter={() => onHoldChange?.(true)}
        onPointerLeave={() => onHoldChange?.(false)}
        onFocus={() => onHoldChange?.(true)}
        onBlur={(event) => {
          // Le focus passe d'un bouton du toast à l'autre : toujours tenu
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onHoldChange?.(false);
        }}
      >
        <span aria-hidden className={cx("flex size-7 shrink-0 items-center justify-center rounded-pill", toneClasses)}>
          <Icon name={icon} size={16} strokeWidth={3} />
        </span>
        <div className="flex-1">{title}</div>
        {action}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="ml-auto cursor-pointer rounded-sm p-1 text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white"
          >
            <Icon name="x" size={16} />
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}
