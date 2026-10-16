// Table unique des URL du front (docs/plans/README.md, « Routes du front ») : la navigation, le pied de page, les
// pages et les tests l'utilisent au lieu d'écrire les chemins à la main.

/** Documents de WL09, un onglet chacun. */
export const LEGAL_DOCS = ["cgu", "mentions-legales", "confidentialite"] as const;
export type LegalDoc = (typeof LEGAL_DOCS)[number];

/** Sujets du formulaire de contact de WL24, présélectionnables par `?sujet=`. */
export const CONTACT_SUBJECTS = [
  "question",
  "paiement",
  "livraison",
  "changement-parent",
  "candidature",
  "autre",
] as const;
export type ContactSubject = (typeof CONTACT_SUBJECTS)[number];

/** Ajoute `?next=<chemin>` (retour après connexion), un seul paramètre partout. */
function withNext(path: string, next?: string): string {
  return next ? `${path}?next=${encodeURIComponent(next)}` : path;
}

export const routes = {
  home: "/",
  howItWorks: "/#comment-ca-marche",
  courses: "/parcours",
  course: (slug: string) => `/parcours/${slug}`,
  categories: "/categories",
  shop: "/boutique",
  events: "/evenements",
  event: (slug: string) => `/evenements/${slug}`,
  schools: "/ecoles",
  quote: (offer?: string) => (offer ? `/ecoles?offre=${offer}#devis` : "/ecoles#devis"),
  about: "/a-propos",
  blog: "/blog",
  article: (slug: string) => `/blog/${slug}`,
  guides: "/guides",
  legal: (doc: LegalDoc) => `/legal/${doc}`,
  parentalConsent: "/legal/cgu#consentement-parental",
  help: "/aide",
  faq: "/aide#faq",
  contact: (subject?: ContactSubject) => (subject ? `/aide?sujet=${subject}#contact` : "/aide#contact"),
  // Routes du lot 2 (authentification)
  login: (next?: string) => withNext("/connexion", next),
  signup: (next?: string) => withNext("/inscription", next),
  parentSignup: "/inscription/parent",
  // Back-office Next.js (lot 6, WAD01-WAD05)
  backoffice: {
    home: "/backoffice",
    impact: "/backoffice/impact",
    kpi: (code: string) => `/backoffice/impact/indicateurs/${encodeURIComponent(code)}`,
    accessDenied: "/backoffice/acces-refuse",
  },
} as const;

/** Rubriques de la navigation publique : l'onglet actif est déduit du chemin. */
export type PublicSection = "home" | "courses" | "shop" | "schools" | "resources" | "about";

const SECTION_PREFIXES: Array<[string, PublicSection]> = [
  [routes.courses, "courses"],
  [routes.categories, "courses"],
  [routes.shop, "shop"],
  [routes.schools, "schools"],
  [routes.blog, "resources"],
  [routes.events, "resources"],
  [routes.guides, "resources"],
  [routes.about, "about"],
];

/** Rubrique active pour un chemin (« Ressources » sur le blog, les événements et les guides). */
export function sectionOf(pathname: string): PublicSection | null {
  if (pathname === routes.home) {
    return "home";
  }
  const match = SECTION_PREFIXES.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  return match ? match[1] : null;
}
