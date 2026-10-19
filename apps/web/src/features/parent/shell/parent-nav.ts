import type { NavEntry } from "@/components/ds/AppShell";
import { routes } from "@/lib/routes";

const p = routes.parent;

/**
 * Navigation du parent (SPEC-ECRANS-3 §5.11, « Shell ») : 6 entrées. Une entrée dont les écrans ne sont pas encore
 * livrés est masquée (jamais « Bientôt ») ; chaque étape du lot 4 lève la sienne.
 */
export const parentNav: NavEntry[] = [
  { id: "home", icon: "home", label: "Accueil", href: p.home },
  { id: "children", icon: "user", label: "Mes enfants", href: p.children },
  { id: "events", icon: "trophy", label: "Événements", href: p.events, hidden: true },
  { id: "orders", icon: "cart", label: "Commandes", href: p.orders, hidden: true },
  { id: "help", icon: "book", label: "Aide", href: p.help, hidden: true },
  { id: "settings", icon: "gear", label: "Paramètres", href: p.settings, hidden: true },
];

/** Lien du profil dans le header : les paramètres (WPD08) une fois livrés (4.9), l'accueil d'ici là. */
export const PARENT_PROFILE_HREF: string = p.home;

export type ParentSectionId = "home" | "children" | "events" | "orders" | "help" | "settings";

/** Entrée active (`null` pour WPD14, ouvert depuis la cloche) et titre du header (h1 de la page). */
export type ParentSection = { active: ParentSectionId | null; title: string };

const ID = "[^/]+";

/**
 * Table unique « chemin → entrée active et titre du header » (§5.11, rattachement des écrans). Du plus précis au plus
 * général : la première expression qui correspond l'emporte.
 */
const SECTIONS: Array<[pattern: RegExp, section: ParentSection]> = [
  [/^\/parent\/notifications$/, { active: null, title: "Notifications" }],
  [new RegExp(`^/parent/consentements/${ID}$`), { active: "home", title: "Demande de consentement" }],
  [new RegExp(`^/parent/demandes/${ID}$`), { active: "home", title: "Demande de paiement" }],
  [/^\/parent\/enfants\/ajouter$/, { active: "children", title: "Ajouter un enfant" }],
  [new RegExp(`^/parent/enfants/${ID}/modifier$`), { active: "children", title: "Modifier le profil" }],
  [new RegExp(`^/parent/enfants/${ID}/rapport$`), { active: "children", title: "Rapport hebdomadaire" }],
  [new RegExp(`^/parent/enfants/${ID}/supprimer$`), { active: "children", title: "Supprimer le compte" }],
  [/^\/parent\/enfants(\/.*)?$/, { active: "children", title: "Mes enfants" }],
  [new RegExp(`^/parent/evenements/${ID}/inscription$`), { active: "events", title: "Inscrire un enfant" }],
  [/^\/parent\/evenements(\/.*)?$/, { active: "events", title: "Steamy Events" }],
  [/^\/parent\/boutique\/panier$/, { active: "orders", title: "Mon panier" }],
  [/^\/parent\/boutique(\/.*)?$/, { active: "orders", title: "Boutique de kits" }],
  [/^\/parent\/commandes(\/.*)?$/, { active: "orders", title: "Commandes" }],
  [/^\/parent\/aide$/, { active: "help", title: "Aide & support" }],
  [/^\/parent\/parametres$/, { active: "settings", title: "Paramètres" }],
];

/** Entrée active et titre du header pour un chemin de l'espace parent ; l'accueil par défaut. */
export function parentSection(pathname: string, firstName: string): ParentSection {
  const match = SECTIONS.find(([pattern]) => pattern.test(pathname));
  if (match) return match[1];
  return { active: "home", title: firstName ? `Bonjour ${firstName} 👋` : "Accueil" };
}
