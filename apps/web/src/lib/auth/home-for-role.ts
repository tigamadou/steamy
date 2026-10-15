import type { Schemas } from "@steamy/api-client";

export type Me = Schemas["Me"];
export type Role = Schemas["RoleEnum"];
export type ProfileStep = Schemas["ProfileStepEnum"];

/** Espace de chaque rôle (README des plans, « Routes du front »). */
export const ROLE_HOME: Record<Role, string> = {
  learner: "/apprenant",
  parent: "/parent",
  teacher: "/enseignant",
};

/** Étape de profil restante (`profileStep` d'`accounts/me/`) → écran W11-W14 ou WP07-WP09. */
export const PROFILE_STEP_PATH: Record<ProfileStep, string> = {
  "learner-info": "/inscription/apprenant/profil/infos",
  "learner-school": "/inscription/apprenant/profil/ecole",
  "learner-goals": "/inscription/apprenant/profil/objectifs",
  "learner-avatar": "/inscription/apprenant/profil/avatar",
  "parent-location": "/inscription/parent/profil/localisation",
  "parent-about": "/inscription/parent/profil/a-propos",
  "parent-children": "/inscription/parent/profil/enfants",
};

/** Écran de bienvenue qui clôt le profil (W15, WP10). */
export const WELCOME_PATH: Partial<Record<Role, string>> = {
  learner: "/inscription/apprenant/bienvenue",
  parent: "/inscription/parent/bienvenue",
};

/**
 * Où envoyer un utilisateur connecté : l'étape de profil restante s'il en a une (même parcours pour l'enfant créé
 * par son parent, D51), sinon l'espace de son rôle. Sans rôle de persona (personnel), retour à l'accueil.
 */
export function homeForRole(me: Pick<Me, "role" | "profileStep">): string {
  if (me.profileStep) return PROFILE_STEP_PATH[me.profileStep];
  return me.role ? ROLE_HOME[me.role] : "/";
}
