// Contenu éditorial du site public (D10) : textes de marque, réseaux sociaux, mentions du pied de page.
// Versionné ici plutôt que codé dans les composants ; cohérent avec le jeu de démonstration unique (D2).

/** Domaine de production : base des URL canoniques, du sitemap et d'Open Graph (staging servi en `noindex`). */
export const SITE_URL = "https://steamy.example";

export const site = {
  name: "Steamy",
  tagline: "Nous formons les inventeurs de demain",
  description:
    "Parcours de robotique, de code et d'électronique pour les 10–17 ans en Afrique francophone, avec des kits à construire et un suivi parent.",
  mission:
    "Nous formons les inventeurs de demain. Notre mission : faire naître des champions du numérique, partout en Afrique francophone.",
  copyright: "© 2026 Steamy · Cotonou, Bénin",
  // Comptes officiels : à confirmer par le porteur produit avant la mise en production.
  social: [
    { network: "instagram", label: "Instagram", href: "https://www.instagram.com/steamy" },
    { network: "x", label: "X", href: "https://x.com/steamy" },
    { network: "linkedin", label: "LinkedIn", href: "https://www.linkedin.com/company/steamy" },
  ],
} as const;

export type SocialNetwork = (typeof site.social)[number]["network"];
