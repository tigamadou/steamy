import type { ReactNode } from "react";

import { shortName } from "@/features/shell/short-name";
import { getServerApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";

import { ParentShellFrame } from "./ParentShellFrame";

/**
 * Shell du parent, côté serveur (sous `<Suspense>`) : utilisateur de la session (`accounts/me/`, jamais en dur) et
 * compteur de non-lues. Sans session, la garde de rôle du layout parent redirige, et le shell ne rend rien.
 */
export async function ParentShell({ children }: { children: ReactNode }) {
  const [me, unread] = await Promise.all([
    getCurrentUser(),
    getServerApi().then((api) => api.GET("/api/notifications/unread-count/")),
  ]);
  if (!me) return null;
  const subtitle = ["Parent", me.city].filter(Boolean).join(" · ");
  return (
    <ParentShellFrame
      user={{ firstName: me.firstName, name: shortName(me.firstName, me.lastName), subtitle }}
      unreadCount={unread.data?.count ?? 0}
    >
      {children}
    </ParentShellFrame>
  );
}
