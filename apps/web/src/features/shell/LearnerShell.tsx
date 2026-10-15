import type { ReactNode } from "react";

import { getServerApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";

import { LearnerShellFrame } from "./LearnerShellFrame";

/** « Léa A. » : prénom et initiale du nom. */
export function shortName(firstName: string, lastName: string): string {
  const initial = lastName.trim().charAt(0);
  return initial ? `${firstName} ${initial.toUpperCase()}.` : firstName;
}

/**
 * Shell de l'apprenant, côté serveur (sous `<Suspense>`) : profil courant (`accounts/me/`, déjà lu par la garde de
 * rôle dans la même requête) et compteur de non-lues (`notifications/unread-count/`).
 */
export async function LearnerShell({ children }: { children: ReactNode }) {
  const [me, unread] = await Promise.all([
    getCurrentUser(),
    getServerApi().then((api) => api.GET("/api/notifications/unread-count/")),
  ]);
  // La garde de rôle du layout parent a déjà écarté une session absente.
  const { firstName, lastName, avatar, schoolGrade, city } = me!;
  const subtitle = [schoolGrade?.label, city].filter(Boolean).join(" · ");
  return (
    <LearnerShellFrame
      user={{
        firstName,
        name: shortName(firstName, lastName),
        subtitle: subtitle || undefined,
        avatarEmoji: avatar?.emoji,
      }}
      unreadCount={unread.data?.count ?? 0}
    >
      {children}
    </LearnerShellFrame>
  );
}
