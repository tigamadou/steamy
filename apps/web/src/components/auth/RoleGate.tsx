import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { homeForRole, type Role } from "@/lib/auth/home-for-role";
import { PATH_HEADER } from "@/lib/auth/path-header";
import { loginUrl } from "@/lib/auth/safe-next";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * Garde de rôle d'un espace (layouts `(apprenant)`, `(parent)`, `(enseignant)`), à placer sous `<Suspense>` :
 * session absente ou expirée → connexion avec retour (`?next=`) ; autre rôle → son propre espace.
 */
export async function RoleGate({ role, children }: { role: Role; children: ReactNode }) {
  const me = await getCurrentUser();
  if (!me) {
    redirect(loginUrl((await headers()).get(PATH_HEADER)));
  }
  if (me.role !== role) {
    redirect(homeForRole(me));
  }
  return children;
}
