"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { AppShell, LogoutModal, type AppShellUser } from "@/components/ds/AppShell";
import { useUnreadCount } from "@/features/shell/unread-count";
import { logout } from "@/lib/auth/logout";
import { routes } from "@/lib/routes";

import { PARENT_PROFILE_HREF, parentNav, parentSection } from "./parent-nav";

export type ParentShellFrameProps = {
  user: AppShellUser & { firstName: string };
  unreadCount: number;
  children: ReactNode;
};

// Partie client du shell parent : entrée active et titre dérivés de l'URL, sans recherche dans le header (§5.11),
// compteur vivant, déconnexion au vouvoiement.
export function ParentShellFrame({ user, unreadCount, children }: ParentShellFrameProps) {
  const pathname = usePathname();
  const router = useRouter();
  const count = useUnreadCount(unreadCount);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const { active, title } = parentSection(pathname, user.firstName);

  return (
    <AppShell
      nav={parentNav}
      active={active}
      user={user}
      headerTitle={title}
      unreadCount={count}
      notificationsHref={routes.parent.notifications}
      profileHref={PARENT_PROFILE_HREF}
      navLabel="Navigation de votre espace"
      onLogout={() => setLogoutOpen(true)}
    >
      {children}
      <LogoutModal
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        register="vous"
        onConfirm={async () => {
          await logout();
          router.replace(routes.login());
          router.refresh();
        }}
      />
    </AppShell>
  );
}
