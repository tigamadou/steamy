"use client";

import type { ReactNode } from "react";

import type { AppShellUser } from "@/components/ds/AppShell";
import { SpaceShellFrame } from "@/features/shell/SpaceShellFrame";
import { routes } from "@/lib/routes";

import { TEACHER_PROFILE_HREF, teacherNav, teacherSection } from "./teacher-nav";

export type TeacherShellFrameProps = {
  user: AppShellUser & { firstName: string };
  unreadCount: number;
  children: ReactNode;
};

// Partie client du shell enseignant : sans recherche dans le header (§5.12), vouvoiement, déconnexion confirmée.
export function TeacherShellFrame({ user, unreadCount, children }: TeacherShellFrameProps) {
  return (
    <SpaceShellFrame
      user={user}
      unreadCount={unreadCount}
      nav={teacherNav}
      section={teacherSection}
      register="vous"
      navLabel="Navigation de votre espace"
      notificationsHref={routes.teacher.notifications}
      profileHref={TEACHER_PROFILE_HREF}
    >
      {children}
    </SpaceShellFrame>
  );
}
