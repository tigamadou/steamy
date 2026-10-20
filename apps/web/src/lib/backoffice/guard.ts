import { headers } from "next/headers";
import { redirect } from "next/navigation";

import type { Me } from "@/lib/auth/home-for-role";
import { PATH_HEADER } from "@/lib/auth/path-header";
import { getCurrentUser } from "@/lib/auth/session";
import { routes } from "@/lib/routes";
import { publicApiUrl } from "@/lib/runtime-config";

import { adminLoginUrl, hasGroup, isVerifiedStaff, type StaffGroup } from "./access";

/** Origine publique du front telle que le navigateur l'a demandée (proxy inverse compris). */
function requestOrigin(h: Pick<Headers, "get">): string {
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

/** Connexion du personnel (WAD15) qui ramène à `path` (une page du back-office). */
export async function backofficeLoginUrl(path: string | null): Promise<string> {
  return adminLoginUrl(publicApiUrl(), requestOrigin(await headers()), path);
}

/**
 * Garde du back-office (layout `(backoffice)`, à placer sous `<Suspense>`) : personnel connecté par WAD15, session
 * vérifiée par TOTP (D72). Sinon, connexion de l'admin Django avec retour à la page demandée.
 */
export async function requireStaff(): Promise<Me> {
  const me = await getCurrentUser();
  if (!isVerifiedStaff(me)) {
    redirect(await backofficeLoginUrl((await headers()).get(PATH_HEADER)));
  }
  return me;
}

/**
 * Contrôle du groupe par page : le layout ne se réexécute pas à chaque navigation, chaque page restreinte appelle
 * donc cette garde. Hors des groupes demandés → page d'accès refusé.
 */
export async function requireGroups(groups: readonly StaffGroup[]): Promise<Me> {
  const me = await requireStaff();
  if (!hasGroup(me, groups)) {
    redirect(routes.backoffice.accessDenied);
  }
  return me;
}
