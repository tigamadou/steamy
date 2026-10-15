import { SignedInRedirect } from "@/components/auth/SignedInRedirect";
import { safeNext } from "@/lib/auth/safe-next";

import { LoginForm } from "./LoginForm";

/** Lit `?next=` et la session à la requête : un utilisateur déjà connecté est renvoyé vers son espace. */
export async function LoginGate({ searchParams }: Pick<PageProps<"/connexion">, "searchParams">) {
  const { next, compte } = await searchParams;
  const target = safeNext(typeof next === "string" ? next : null);
  await SignedInRedirect({ target });
  // WP02 : numéro déjà inscrit, prouvé par le code SMS (C13)
  const notice = compte === "existant" ? "Vous avez déjà un compte avec ce numéro : connectez-vous." : undefined;
  return <LoginForm next={target} notice={notice} />;
}
