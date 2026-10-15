import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import {
  homeForRole,
  PROFILE_STEP_PATH,
  WELCOME_PATH,
  type Me,
  type ProfileStep,
  type Role,
} from "@/lib/auth/home-for-role";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * Garde des étapes de profil (W11-W15, WP07-WP10), sous `<Suspense>` : utilisateur connecté, du bon rôle, et dont
 * l'étape restante (`profileStep` d'`accounts/me/`, `null` une fois complet) est l'une de celles de l'écran.
 * Sinon : connexion, espace du rôle, ou écran de l'étape réelle (pas de retour sur une étape consommée).
 */
export async function ProfileGate({
  role,
  steps,
  children,
}: {
  role: Role;
  steps: (ProfileStep | null)[];
  children: (me: Me) => ReactNode;
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/connexion");
  if (me.role !== role) redirect(homeForRole(me));
  if (!steps.includes(me.profileStep)) {
    redirect(me.profileStep ? PROFILE_STEP_PATH[me.profileStep] : (WELCOME_PATH[role] as string));
  }
  return children(me);
}
