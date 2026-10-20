"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { AppShell, LogoutModal, type AppShellUser, type NavEntry } from "@/components/ds/AppShell";
import { logout } from "@/lib/auth/logout";
import { routes } from "@/lib/routes";

import { useUnreadCount } from "./unread-count";

export type SpaceShellFrameProps = {
  user: AppShellUser & { firstName: string };
  unreadCount: number;
  nav: NavEntry[];
  /** Entrée active et titre du header dérivés de l'URL (table unique de l'espace). */
  section: (pathname: string, firstName: string) => { active: string | null; title: string };
  register: "tu" | "vous";
  navLabel: string;
  notificationsHref: string;
  profileHref: string;
  headerSearch?: ReactNode;
  children: ReactNode;
};

// Partie client commune aux shells d'espace (apprenant, parent) : entrée active et titre dérivés de l'URL, compteur
// vivant, déconnexion confirmée (WD16) au registre de l'espace.
export function SpaceShellFrame({ user, unreadCount, section, register, children, ...shell }: SpaceShellFrameProps) {
  const pathname = usePathname();
  const router = useRouter();
  const count = useUnreadCount(unreadCount);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const { active, title } = section(pathname, user.firstName);

  return (
    <AppShell
      {...shell}
      active={active}
      user={user}
      headerTitle={title}
      unreadCount={count}
      onLogout={() => setLogoutOpen(true)}
    >
      {children}
      <LogoutModal
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        register={register}
        onConfirm={async () => {
          await logout();
          router.replace(routes.login());
          router.refresh();
        }}
      />
    </AppShell>
  );
}
