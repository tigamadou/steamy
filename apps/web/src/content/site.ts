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

/** Chiffres vitrine (WL01, WL10) : contenu éditorial, à mettre à jour par le porteur produit (D2, D10). */
export const stats = [
  { value: "2024", label: "Création" },
  { value: "1 000+", label: "Apprenants" },
  { value: "12", label: "Villes" },
  { value: "350", label: "Missions" },
] as const;

/** Bande de chiffres de l'accueil (WL01) ; le premier sert aussi à la preuve sociale du hero. */
export const homeStats = [
  { value: "1 000+", label: "Apprenants" },
  { value: "2 500", label: "Certifications" },
  { value: "350", label: "Missions" },
  { value: "20", label: "Instructeurs" },
] as const;

/** Page « À propos » (WL10). Équipe : adultes uniquement (D15). */
export const about = {
  kicker: "Notre mission",
  title: "Former les inventeurs de demain",
  lead: "Steamy rend la robotique, le code et l'IA accessibles à chaque jeune d'Afrique francophone, par la pratique, avec des kits et des Steamy Events.",
  values: [
    {
      emoji: "🛠",
      title: "Apprendre en faisant",
      description: "On construit pour de vrai : robots, circuits, programmes.",
      color: "var(--cat-robotique)",
    },
    {
      emoji: "🌍",
      title: "Accessible à tous",
      description: "Paiement Mobile Money, pages légères pour les réseaux lents, prix adaptés au contexte local.",
      color: "var(--cat-ia)",
    },
    {
      emoji: "🤝",
      title: "Ensemble",
      description: "Ateliers Steamy Events et parents impliqués : on apprend mieux ensemble.",
      color: "var(--amber-500)",
    },
  ],
  team: [
    { name: "Koffi Adékambi", role: "Fondateur", emoji: "🦉", color: "var(--primary-500)" },
    { name: "Marie Dossou", role: "Pédagogie", emoji: "🦊", color: "var(--cat-ia)" },
    { name: "Yann Sossa", role: "Robotique", emoji: "🐯", color: "var(--amber-500)" },
    { name: "Inès Kpadonou", role: "Événements", emoji: "🐼", color: "var(--cat-code)" },
  ],
} as const;

export type SocialNetwork = (typeof site.social)[number]["network"];
