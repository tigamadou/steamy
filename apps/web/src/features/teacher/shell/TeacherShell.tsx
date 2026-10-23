import type { ReactNode } from "react";

import { shortName } from "@/features/shell/short-name";
import { getServerApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";

import { TeacherShellFrame } from "./TeacherShellFrame";

/**
 * Shell de l'enseignant, côté serveur (sous `<Suspense>`) : utilisateur de la session (`accounts/me/`, jamais en
 * dur) et compteur de non-lues. Sans session, la garde de rôle du layout enseignant redirige.
 */
export async function TeacherShell({ children }: { children: ReactNode }) {
  const [me, unread] = await Promise.all([
    getCurrentUser(),
    getServerApi().then((api) => api.GET("/api/notifications/unread-count/")),
  ]);
  if (!me) return null;
  return (
    <TeacherShellFrame
      user={{ firstName: me.firstName, name: shortName(me.firstName, me.lastName), subtitle: "Enseignant" }}
      unreadCount={unread.data?.count ?? 0}
    >
      {children}
    </TeacherShellFrame>
  );
}
