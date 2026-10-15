"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState, useTransition, type ReactNode } from "react";

import { Avatar } from "@/components/ds/Avatar";
import { Icon } from "@/components/ds/Icon";
import { Logo } from "@/components/ds/Logo";
import { logout } from "@/lib/auth/logout";
import type { NavGroup, NavItem } from "@/lib/backoffice/access";
import { routes } from "@/lib/routes";
import { cx } from "@/lib/cx";

import { AdminMenuContext } from "./AdminMenu";

export type AdminShellProps = {
  /** Utilisateur issu de la session (`accounts/me/`). */
  user: { name: string; groups: string };
  nav: NavGroup[];
  /** Connexion du personnel (WAD15), ouverte après la déconnexion. */
  loginUrl: string;
  children: ReactNode;
};

function isActive(item: NavItem, pathname: string): boolean {
  if (item.external) return false;
  if (item.href === routes.backoffice.home) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

// Portage de `WebAdminShell` (design/screens-admin-web.jsx) : barre latérale sombre, groupes Pilotage (pages
// Next.js) / Plateforme / Système (admin Django). Sous 1024 px, la barre devient un tiroir.
export function AdminShell({ user, nav, loginUrl, children }: AdminShellProps) {
  const pathname = usePathname();
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const onLogout = () => {
    setFailed(false);
    startTransition(async () => {
      try {
        await logout();
      } catch {
        setFailed(true);
        return;
      }
      window.location.assign(loginUrl);
    });
  };

  return (
    <AdminMenuContext value={{ open, toggle: () => setOpen((value) => !value), menuId }}>
      <div className="flex min-h-dvh bg-ink-50 font-sans text-ink-900">
        {open && <div aria-hidden onClick={close} className="fixed inset-0 z-30 bg-ink-900/40 lg:hidden" />}
        <aside
          id={menuId}
          aria-label="Back-office"
          className={cx(
            "flex w-60 shrink-0 flex-col bg-ink-900 px-3.5 py-5 text-surface",
            "max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-40 max-lg:transition-transform max-lg:duration-200",
            "lg:sticky lg:top-0 lg:h-dvh",
            open ? "max-lg:translate-x-0" : "max-lg:invisible max-lg:-translate-x-full",
          )}
        >
          <div className="flex items-center justify-between px-1.5 pt-1 pb-4.5">
            <Logo variant="white" height={24} eager />
            <span className="rounded-pill border border-surface/25 px-2 py-0.75 text-[9px] font-extrabold tracking-[.14em] text-surface/70 uppercase">
              Admin
            </span>
          </div>
          <nav aria-label="Navigation du back-office" className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
            {nav.map((group) => (
              <div key={group.label}>
                <h2 className="m-0 px-2.5 pt-3.5 pb-1.5 text-[10px] font-extrabold tracking-[.08em] text-surface/60 uppercase">
                  {group.label}
                </h2>
                <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                  {group.items.map((item) => {
                    const active = isActive(item, pathname);
                    return (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          prefetch={item.external ? false : undefined}
                          aria-current={active ? "page" : undefined}
                          onClick={close}
                          className={cx(
                            "flex h-10 w-full items-center gap-2.75 rounded-[10px] px-2.75 text-[13px] font-extrabold transition-colors",
                            "focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-surface",
                            active
                              ? "bg-surface text-ink-900"
                              : "text-surface/75 hover:bg-surface/10 hover:text-surface",
                          )}
                        >
                          <Icon name={item.icon} size={18} strokeWidth={active ? 2.5 : 2} />
                          {item.label}
                          {item.external && <span className="sr-only">{" (admin Django)"}</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
          <div className="mt-2 flex items-center gap-2.5 border-t border-surface/10 px-2 pt-2.5">
            <Avatar name={user.name} size={34} color="var(--ink-700)" decorative />
            <div className="min-w-0 flex-1">
              <p className="m-0 truncate text-[13px] font-extrabold text-surface">{user.name}</p>
              <p className="m-0 truncate text-[11px] font-semibold text-surface/70">{user.groups}</p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              disabled={pending}
              aria-busy={pending || undefined}
              className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-surface/70 hover:bg-surface/10 hover:text-surface focus-visible:outline-3 focus-visible:outline-surface disabled:cursor-wait"
            >
              <Icon name="logout" size={16} title="Se déconnecter" />
            </button>
          </div>
          <p role="alert" className="m-0 px-2 text-xs font-bold text-surface empty:hidden">
            {failed ? "La déconnexion a échoué. Merci de réessayer." : null}
          </p>
        </aside>
        <main id="contenu" className="flex min-w-0 flex-1 flex-col">
          {children}
        </main>
      </div>
    </AdminMenuContext>
  );
}
