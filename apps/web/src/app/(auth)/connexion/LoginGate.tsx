import { SignedInRedirect } from "@/components/auth/SignedInRedirect";
import { safeNext } from "@/lib/auth/safe-next";

import { LoginForm } from "./LoginForm";

/** Lit `?next=` et la session à la requête : un utilisateur déjà connecté est renvoyé vers son espace. */
export async function LoginGate({ searchParams }: Pick<PageProps<"/connexion">, "searchParams">) {
  const { next } = await searchParams;
  const target = safeNext(typeof next === "string" ? next : null);
  await SignedInRedirect({ target });
  return <LoginForm next={target} />;
}
