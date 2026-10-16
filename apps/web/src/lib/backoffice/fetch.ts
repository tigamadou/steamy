import type { Schemas } from "@steamy/api-client";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { PATH_HEADER } from "@/lib/auth/path-header";
import { routes } from "@/lib/routes";

import { backofficeLoginUrl } from "./guard";

type Result<T> = { data?: T; error?: Schemas["Error"]; response: Response };

/**
 * Réponse d'un endpoint `/api/backoffice/` (§7.8) lue par une page serveur. L'API refait les contrôles à chaque
 * requête (D72) : session expirée ou non vérifiée par TOTP → WAD15 avec retour ici ; groupe insuffisant → accès
 * refusé ; ressource inconnue → 404. Toute autre erreur remonte à `error.tsx` (WX02).
 */
export async function backofficeData<T>(request: Promise<Result<T>>): Promise<T> {
  const { data, error, response } = await request;
  if (response.ok && data !== undefined) return data;
  if (response.status === 401 || error?.code === "OTP_REQUIRED") {
    redirect(await backofficeLoginUrl((await headers()).get(PATH_HEADER)));
  }
  if (error?.code === "PERMISSION_DENIED") redirect(routes.backoffice.accessDenied);
  if (response.status === 404) notFound();
  throw new Error(`Back-office : réponse inattendue de l'API (${response.status})`);
}
