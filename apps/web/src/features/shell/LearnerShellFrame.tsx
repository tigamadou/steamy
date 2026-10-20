"use client";

import type { ReactNode } from "react";

import { HeaderSearch, type AppShellUser } from "@/components/ds/AppShell";
import { routes } from "@/lib/routes";

import { learnerNav, learnerSection } from "./learner-nav";
import { SpaceShellFrame } from "./SpaceShellFrame";

export type LearnerShellFrameProps = {
  user: AppShellUser & { firstName: string };
  unreadCount: number;
  children: ReactNode;
};

// Partie client du shell apprenant : recherche de parcours dans le header, tutoiement, déconnexion (WD16).
export function LearnerShellFrame({ user, unreadCount, children }: LearnerShellFrameProps) {
  return (
    <SpaceShellFrame
      user={user}
      unreadCount={unreadCount}
      nav={learnerNav}
      section={learnerSection}
      register="tu"
      navLabel="Navigation de ton espace"
      notificationsHref={routes.learner.notifications}
      profileHref={routes.learner.profile}
      headerSearch={
        <HeaderSearch
          action={routes.learner.catalog}
          placeholder="Rechercher un parcours…"
          label="Rechercher un parcours"
        />
      }
    >
      {children}
    </SpaceShellFrame>
  );
}
