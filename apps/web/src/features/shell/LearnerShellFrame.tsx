"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { AppShell, HeaderSearch, LogoutModal, type AppShellUser } from "@/components/ds/AppShell";
import { logout } from "@/lib/auth/logout";
import { routes } from "@/lib/routes";

import { learnerNav, learnerSection } from "./learner-nav";
import { useUnreadCount } from "./unread-count";

export type LearnerShellFrameProps = {
  user: AppShellUser & { firstName: string };
  unreadCount: number;
  children: ReactNode;
};

// Partie client du shell apprenant : entrée active et titre dérivés de l'URL, compteur vivant, déconnexion (WD16).
export function LearnerShellFrame({ user, unreadCount, children }: LearnerShellFrameProps) {
  const pathname = usePathname();
  const router = useRouter();
  const count = useUnreadCount(unreadCount);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const { active, title } = learnerSection(pathname, user.firstName);

  return (
    <AppShell
      nav={learnerNav}
      active={active}
      user={user}
      headerTitle={title}
      headerSearch={
        <HeaderSearch
          action={routes.learner.catalog}
          placeholder="Rechercher un parcours…"
          label="Rechercher un parcours"
        />
      }
      unreadCount={count}
      notificationsHref={routes.learner.notifications}
      profileHref={routes.learner.profile}
      navLabel="Navigation de ton espace"
      onLogout={() => setLogoutOpen(true)}
    >
      {children}
      <LogoutModal
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        register="tu"
        onConfirm={async () => {
          await logout();
          router.replace(routes.login());
          router.refresh();
        }}
      />
    </AppShell>
  );
}
