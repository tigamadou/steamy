import { routes, type PublicSection } from "@/lib/routes";

// Entrées de la navigation publique (SPEC-ECRANS-1 §1.1). Neutralisées : « Défis » (WL13), « Ateliers » (WL08,
// fusionné dans les événements), « Communauté » (WL19) et « Tutoriels » (WL15), reportés (S7, S8).

export type NavLink = { section: PublicSection; label: string; href: string };

export const MAIN_LINKS: NavLink[] = [
  { section: "home", label: "Accueil", href: routes.home },
  { section: "courses", label: "Parcours", href: routes.courses },
  { section: "shop", label: "Boutique", href: routes.shop },
  { section: "schools", label: "Écoles", href: routes.schools },
];

export const ABOUT_LINK: NavLink = { section: "about", label: "À propos", href: routes.about };

export type ResourceLink = { label: string; emoji: string; href: string };

export const RESOURCE_LINKS: ResourceLink[] = [
  { label: "Blog", emoji: "📰", href: routes.blog },
  { label: "Événements", emoji: "📅", href: routes.events },
  { label: "Guides gratuits", emoji: "📥", href: routes.guides },
];

/**
 * `aria-current` d'un lien : `page` sur la page même, `true` dans sa rubrique (fiche d'un parcours…).
 */
export function currentOf(href: string, pathname: string | null, active: boolean): "page" | "true" | undefined {
  if (pathname === href) {
    return "page";
  }
  return active ? "true" : undefined;
}
