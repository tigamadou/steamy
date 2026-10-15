// Guides PDF de WL20 (D14) : fichiers statiques de public/guides/, téléchargement libre, sans email.

export type Guide = {
  slug: string;
  title: string;
  description: string;
  emoji: string;
  /** Couleur de la couverture : un token. */
  color: string;
  /** Nombre de pages du PDF (vérifié par un test). */
  pages: number;
  /** Chemin public du PDF. */
  file: string;
};

export const GUIDES: Guide[] = [
  {
    slug: "guide-du-jeune-roboticien",
    title: "Le guide du jeune roboticien",
    description: "Capteurs, cerveau, moteurs : les trois briques d'un robot et un premier projet pas à pas.",
    emoji: "📘",
    color: "var(--cat-robotique)",
    pages: 5,
    file: "/guides/guide-du-jeune-roboticien.pdf",
  },
  {
    slug: "bases-de-l-electronique",
    title: "Bases de l'électronique illustrées",
    description: "Tension, courant, résistance et ton premier circuit avec une LED.",
    emoji: "⚡",
    color: "var(--cat-electronique)",
    pages: 4,
    file: "/guides/bases-de-l-electronique.pdf",
  },
  {
    slug: "scratch-10-mini-projets",
    title: "Scratch : 10 mini-projets",
    description: "Dix idées de jeux et d'animations à coder en moins d'une heure chacune.",
    emoji: "💻",
    color: "var(--cat-code)",
    pages: 3,
    file: "/guides/scratch-10-mini-projets.pdf",
  },
];
