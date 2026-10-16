"use client";

import type { ReactNode } from "react";

import { Icon } from "@/components/ds/Icon";

import { useAdminMenu } from "./AdminMenu";
import { FOCUS } from "./styles";

export type AdminHeaderProps = {
  /** Titre de la page (seul `h1`). */
  title: string;
  /** Actions à droite (boutons, sélecteur de période). */
  actions?: ReactNode;
};

/** En-tête de page du back-office (`.adm-header`) ; sous 1024 px, porte le bouton du menu. */
export function AdminHeader({ title, actions }: AdminHeaderProps) {
  const menu = useAdminMenu();
  return (
    <header className="flex min-h-15.5 shrink-0 flex-wrap items-center gap-3 border-b border-ink-100 bg-surface px-4 py-2.5 sm:px-6.5">
      {menu && (
        <button
          type="button"
          aria-expanded={menu.open}
          aria-controls={menu.menuId}
          onClick={menu.toggle}
          className={`flex size-9.5 cursor-pointer items-center justify-center rounded-[10px] border-[1.5px] border-ink-100 bg-surface text-ink-700 hover:bg-ink-50 lg:hidden ${FOCUS}`}
        >
          <Icon name="menu" size={18} title="Menu du back-office" />
        </button>
      )}
      <h1 className="m-0 min-w-40 flex-1 truncate text-xl font-extrabold tracking-[-.01em] text-ink-900">{title}</h1>
      {actions && <div className="flex max-w-full min-w-0 flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}

/** Zone de contenu défilante sous l'en-tête (`.adm-content`). */
export function AdminContent({ children }: { children: ReactNode }) {
  return <div className="flex-1 px-4 py-6 sm:px-7">{children}</div>;
}
