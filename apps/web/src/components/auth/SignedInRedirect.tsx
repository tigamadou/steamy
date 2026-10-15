import { SESSION_COOKIE } from "@steamy/api-client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { homeForRole } from "@/lib/auth/home-for-role";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * Renvoie un utilisateur déjà connecté vers `target` ou l'espace de son rôle (W16, W02, W03). À placer sous
 * `<Suspense>` : lit le cookie à la requête. Sans cookie de session, aucun appel à l'API. Ne rend rien.
 */
export async function SignedInRedirect({ target = null }: { target?: string | null }) {
  if ((await cookies()).has(SESSION_COOKIE)) {
    const me = await getCurrentUser();
    if (me) redirect(target ?? homeForRole(me));
  }
  return null;
}
