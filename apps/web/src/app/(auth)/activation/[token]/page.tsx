import { redirect } from "next/navigation";

// Ancien format du lien d'invitation (`/activation/<jeton>`), encore dans les emails envoyés avant le passage au
// fragment : le jeton quitte aussitôt le chemin pour le fragment, lu côté client. À retirer quand ces liens ont
// expiré (7 jours après le déploiement, PLAN-API API-L2.7).
export default async function FormerActivationLink({ params }: PageProps<"/activation/[token]">) {
  const { token } = await params;
  redirect(`/activation#jeton=${encodeURIComponent(token)}`);
}
