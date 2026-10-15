import { SESSION_COOKIE } from "@steamy/api-client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { homeForRole } from "@/lib/auth/home-for-role";
import { safeNext } from "@/lib/auth/safe-next";
import { getCurrentUser } from "@/lib/auth/session";

import { LoginForm } from "./LoginForm";

/** Lit `?next=` et la session à la requête : un utilisateur déjà connecté est renvoyé vers son espace. */
export async function LoginGate({ searchParams }: Pick<PageProps<"/connexion">, "searchParams">) {
  const { next } = await searchParams;
  const target = safeNext(typeof next === "string" ? next : null);
  if ((await cookies()).has(SESSION_COOKIE)) {
    const me = await getCurrentUser();
    if (me) redirect(target ?? homeForRole(me));
  }
  return <LoginForm next={target} />;
}
