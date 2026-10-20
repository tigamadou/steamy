"use client";

import type { ReactNode } from "react";

import type { AppShellUser } from "@/components/ds/AppShell";
import { SpaceShellFrame } from "@/features/shell/SpaceShellFrame";
import { routes } from "@/lib/routes";

import { PARENT_PROFILE_HREF, parentNav, parentSection } from "./parent-nav";

export type ParentShellFrameProps = {
  user: AppShellUser & { firstName: string };
  unreadCount: number;
  children: ReactNode;
};

// Partie client du shell parent : sans recherche dans le header (§5.11), vouvoiement, déconnexion confirmée.
export function ParentShellFrame({ user, unreadCount, children }: ParentShellFrameProps) {
  return (
    <SpaceShellFrame
      user={user}
      unreadCount={unreadCount}
      nav={parentNav}
      section={parentSection}
      register="vous"
      navLabel="Navigation de votre espace"
      notificationsHref={routes.parent.notifications}
      profileHref={PARENT_PROFILE_HREF}
    >
      {children}
    </SpaceShellFrame>
  );
}
