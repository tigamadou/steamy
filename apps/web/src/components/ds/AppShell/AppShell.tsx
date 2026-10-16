"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";

import { cx } from "@/lib/cx";

import { Avatar } from "../Avatar";
import { Icon } from "../Icon";
import { Logo } from "../Logo";
import { NavItem, type NavEntry } from "./NavItem";
import { NotificationBell } from "./NotificationBell";

export type AppShellUser = {
  /** Prénom et initiale du nom (« Léa A. »). */
  name: string;
  /** Sous-titre lu dans le profil (« 4ᵉ · Cotonou » pour l'apprenant). */
  subtitle?: string;
  /** Avatar du référentiel (emoji) ; à défaut, les initiales. */
  avatarEmoji?: string;
};

export type AppShellProps = {
  nav: NavEntry[];
  /** Entrée active, dérivée de l'URL par l'appelant (table unique de chaque espace). */
  active: string | null;
  user: AppShellUser;
  /** Titre de la page (h1 unique de la page). */
  headerTitle: ReactNode;
  /** Recherche du header (`HeaderSearch`), ou rien (parent, enseignant). */
  headerSearch?: ReactNode;
  headerActions?: ReactNode;
  /** Nombre de notifications non lues, lu dans l'API. */
  unreadCount: number;
  notificationsHref: string;
  profileHref: string;
  /** Libellé de la navigation principale. */
  navLabel: string;
  /** Ouvre la confirmation de déconnexion (WD16), rendue par l'appelant. */
  onLogout: () => void;
  children: ReactNode;
};

// Shell applicatif unique (SPEC-ECRANS-2 §5.5), paramétré uniquement par ses props et partagé par les espaces
// apprenant, parent et enseignant. Barre latérale de 248 px, repliée en tiroir sous 768 px ; header de 64 px.
export function AppShell({
  nav,
  active,
  user,
  headerTitle,
  headerSearch,
  headerActions,
  unreadCount,
  notificationsHref,
  profileHref,
  navLabel,
  onLogout,
  children,
}: AppShellProps) {
  const drawerId = useId();
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLElement>(null);
  const close = () => setOpen(false);
  // Ferme le tiroir et rend le focus au bouton de menu : la fermeture est appliquée tout de suite, car le bouton
  // est dans la partie `inert` de la page tant que le tiroir est ouvert (un focus y serait ignoré).
  const closeToMenu = () => {
    flushSync(() => setOpen(false));
    menuButton.current?.focus();
  };

  // Tiroir (sous 768 px, seul cas où il s'ouvre) : boîte modale. Focus sur sa première entrée, Tab et Maj+Tab
  // restent dans le tiroir, Échap le ferme et rend le focus au bouton de menu ; le reste de la page est inerte.
  useEffect(() => {
    if (!open) return;
    const box = drawer.current as HTMLElement;
    box.querySelector<HTMLElement>("a, button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeToMenu();
        return;
      }
      if (event.key !== "Tab") return;
      const items = Array.from(box.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input"));
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Passage à 768 px ou plus (rotation, fenêtre agrandie) : le tiroir n'a plus lieu d'être, il se ferme.
  useEffect(() => {
    if (!open) return;
    const wide = window.matchMedia("(min-width: 768px)");
    const onChange = () => {
      if (wide.matches) setOpen(false);
    };
    onChange();
    wide.addEventListener("change", onChange);
    return () => wide.removeEventListener("change", onChange);
  }, [open]);

  // Déconnexion depuis le tiroir : il se ferme et le focus passe au bouton de menu, que la modale WD16 lui rendra.
  const requestLogout = () => {
    if (open) closeToMenu();
    onLogout();
  };

  return (
    <div className="flex min-h-dvh bg-bg font-sans text-ink-900">
      <a
        inert={open || undefined}
        href="#contenu"
        className="sr-only z-50 rounded-md bg-primary-600 px-4 py-3 font-extrabold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Aller au contenu
      </a>
      {open && <div aria-hidden onClick={close} className="fixed inset-0 z-30 bg-ink-900/40 md:hidden" />}
      <aside
        ref={drawer}
        id={drawerId}
        role={open ? "dialog" : undefined}
        aria-modal={open || undefined}
        aria-label={open ? "Menu" : undefined}
        className={cx(
          "flex w-62 shrink-0 flex-col border-r border-ink-100 bg-surface px-4 py-6",
          "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-40 max-md:overflow-y-auto max-md:transition-transform max-md:duration-200 motion-reduce:transition-none",
          "md:sticky md:top-0 md:h-dvh",
          open ? "max-md:translate-x-0" : "max-md:invisible max-md:-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-1 pt-1 pb-6">
          <Link
            href={nav[0]?.href ?? "/"}
            onClick={close}
            className="rounded-sm focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
          >
            <Logo height={36} eager />
          </Link>
          <button
            type="button"
            onClick={closeToMenu}
            className="flex size-10 cursor-pointer items-center justify-center rounded-md text-ink-700 hover:bg-ink-100 focus-visible:outline-3 focus-visible:outline-primary-500 md:hidden"
          >
            <Icon name="x" size={20} title="Fermer le menu" />
          </button>
        </div>
        {headerSearch && <div className="mb-4 md:hidden">{headerSearch}</div>}
        <nav aria-label={navLabel} className="flex-1">
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {nav.map((entry) => (
              <NavItem key={entry.id} entry={entry} active={entry.id === active} onNavigate={close} />
            ))}
          </ul>
        </nav>
        <div className="mt-4 mb-2 flex items-center gap-2.5 rounded-[14px] border border-ink-100 p-2.5">
          <Avatar name={user.name} emoji={user.avatarEmoji} size={32} ring decorative />
          <div className="min-w-0 flex-1">
            <p className="m-0 truncate text-[13px] font-extrabold text-ink-900">{user.name}</p>
            {user.subtitle && <p className="m-0 truncate text-[11px] font-semibold text-ink-600">{user.subtitle}</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={requestLogout}
          className="flex cursor-pointer items-center justify-between gap-2 rounded-[10px] px-2.5 py-2 text-xs font-bold text-ink-600 hover:bg-ink-100 hover:text-ink-700 focus-visible:outline-3 focus-visible:outline-primary-500"
        >
          Déconnexion
          <Icon name="logout" size={16} />
        </button>
      </aside>

      <div inert={open || undefined} className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-ink-100 bg-surface px-4 md:gap-6 md:px-7">
          <div className="flex min-w-0 items-center gap-2">
            <button
              ref={menuButton}
              type="button"
              aria-expanded={open}
              aria-controls={drawerId}
              onClick={() => setOpen(true)}
              className="-ml-2 flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md text-ink-700 hover:bg-ink-100 focus-visible:outline-3 focus-visible:outline-primary-500 md:hidden"
            >
              <Icon name="menu" size={22} title="Ouvrir le menu" />
            </button>
            <h1 className="m-0 truncate text-lg font-extrabold tracking-[-0.01em] md:text-[22px]">{headerTitle}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {headerSearch && <div className="hidden w-80 max-lg:w-56 md:block">{headerSearch}</div>}
            {headerActions}
            <NotificationBell count={unreadCount} href={notificationsHref} />
            <Link
              href={profileHref}
              className="rounded-pill focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
            >
              <Avatar name={user.name} emoji={user.avatarEmoji} size={36} ring decorative />
              <span className="sr-only">Mon profil</span>
            </Link>
          </div>
        </header>
        <main id="contenu" tabIndex={-1} className="flex min-w-0 flex-1 flex-col px-4 py-6 outline-none md:px-8 md:py-7">
          {children}
        </main>
      </div>
    </div>
  );
}
