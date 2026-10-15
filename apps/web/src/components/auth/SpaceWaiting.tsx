import { Logo } from "@/components/ds/Logo";
import { FullScreenStage } from "@/components/ds/FullScreenStage";
import { Mascot } from "@/components/ds/Mascot";
import type { Role } from "@/lib/auth/home-for-role";
import { getCurrentUser } from "@/lib/auth/session";

import { LogoutButton } from "./LogoutButton";

// Registre de chaque espace (C2) : tutoiement pour l'apprenant, vouvoiement pour le parent et l'enseignant.
const COPY: Record<Role, { title: (name: string) => string; text: string; logoutError: string }> = {
  learner: {
    title: (name) => `Salut ${name} !`,
    text: "Ton espace Steamy arrive très bientôt. Reviens vite !",
    logoutError: "La déconnexion a échoué. Réessaie.",
  },
  parent: {
    title: (name) => `Bonjour ${name}`,
    text: "Votre espace parent arrive très bientôt.",
    logoutError: "La déconnexion a échoué. Réessayez.",
  },
  teacher: {
    title: (name) => `Bonjour ${name}`,
    text: "Votre espace enseignant arrive très bientôt.",
    logoutError: "La déconnexion a échoué. Réessayez.",
  },
};

/**
 * Page d'attente minimale d'un espace (lot 2, étape 2.0), remplacée par l'accueil de l'espace aux lots 3, 4 et 5.
 * Rendue sous la garde de rôle : l'utilisateur est connecté et du bon rôle.
 */
export async function SpaceWaiting({ role }: { role: Role }) {
  const me = await getCurrentUser();
  const copy = COPY[role];
  return (
    <FullScreenStage topbar={<Logo height={28} />}>
      <Mascot pose="wave" size={140} />
      <h1 className="text-3xl font-black text-ink-900">{copy.title(me?.firstName ?? "")}</h1>
      <p className="text-base font-semibold text-ink-600">{copy.text}</p>
      <LogoutButton errorMessage={copy.logoutError} />
    </FullScreenStage>
  );
}
