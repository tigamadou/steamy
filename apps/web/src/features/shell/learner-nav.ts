import type { NavEntry } from "@/components/ds/AppShell";
import { routes } from "@/lib/routes";

const l = routes.learner;

/** Navigation de l'apprenant (SPEC-ECRANS-2 §5.5, D39) : 6 entrées, « Badges » masquée tant qu'elle n'est pas conçue. */
export const learnerNav: NavEntry[] = [
  { id: "home", icon: "home", label: "Accueil", href: l.home },
  { id: "courses", icon: "book", label: "Mes parcours", href: l.courses },
  { id: "catalog", icon: "compass", label: "Catalogue", href: l.catalog },
  { id: "wishlist", icon: "heart", label: "Mes souhaits", href: l.wishlist },
  { id: "badges", icon: "trophy", label: "Badges", href: "/apprenant/badges", hidden: true },
  { id: "profile", icon: "user", label: "Profil", href: l.profile },
];

export type LearnerSectionId = "home" | "courses" | "catalog" | "wishlist" | "profile";

export type LearnerSection = { active: LearnerSectionId; title: string };

/**
 * Table unique « segment d'URL → entrée active et titre du header » (§5.5, rattachement des sous-écrans).
 * Du plus précis au plus général : la première entrée dont le préfixe correspond l'emporte.
 */
const SECTIONS: Array<[prefix: string, section: LearnerSection]> = [
  [l.notifications, { active: "home", title: "Notifications" }],
  [l.attempts, { active: "home", title: "Mes tentatives de quiz" }],
  [l.events, { active: "home", title: "Steamy Events" }],
  ["/apprenant/demandes", { active: "catalog", title: "Demande à ton parent" }],
  [l.help, { active: "profile", title: "Aide & Support" }],
  [l.progress, { active: "profile", title: "Ma progression" }],
  [l.orders, { active: "profile", title: "Mes commandes" }],
  [l.parent, { active: "profile", title: "Mon parent" }],
  [l.delivery, { active: "profile", title: "Adresse de livraison" }],
  [l.deletion, { active: "profile", title: "Supprimer mon compte" }],
  [l.editProfile, { active: "profile", title: "Modifier mon profil" }],
  [l.password, { active: "profile", title: "Mot de passe" }],
  [l.profile, { active: "profile", title: "Profil" }],
  [l.courses, { active: "courses", title: "Mes parcours" }],
  [l.catalog, { active: "catalog", title: "Catalogue" }],
  [l.cart, { active: "catalog", title: "Mon panier" }],
  [l.shop, { active: "catalog", title: "Boutique de kits" }],
  [l.wishlist, { active: "wishlist", title: "Mes souhaits" }],
];

/** Entrée active et titre du header pour un chemin de l'espace apprenant. */
export function learnerSection(pathname: string, firstName: string): LearnerSection {
  const match = SECTIONS.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (match) return match[1];
  return { active: "home", title: firstName ? `Salut ${firstName} 👋` : "Accueil" };
}
