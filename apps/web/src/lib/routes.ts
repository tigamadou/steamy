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
  /** WK02 / WK11 · fiche d'un kit (invité). */
  shopKit: (slug: string) => `/boutique/${slug}`,
  /** WK03 / WK10 · panier de l'invité (un apprenant connecté est renvoyé vers le sien). */
  cart: "/boutique/panier",
  /** Tunnel invité (D12) : WK04 → WK05 → WK06. */
  checkout: {
    guest: "/boutique/commande/coordonnees",
    delivery: "/boutique/commande/livraison",
    payment: "/boutique/commande/paiement",
  },
  /** WK07 · suivi d'une commande (lien SMS de l'invité, jeton dans le fragment). */
  order: (reference: string) => `/boutique/commandes/${encodeURIComponent(reference)}`,
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
  // Espace apprenant (lot 3, LOT-3 §4)
  learner: {
    home: "/apprenant",
    notifications: "/apprenant/notifications",
    /** WD04 : onglet « Non lues » et page de la liste dans l'URL (la page 1 et « Toutes » n'y figurent pas). */
    notificationList: (tab: "toutes" | "non-lues" = "toutes", page = 1) => {
      const query = new URLSearchParams();
      if (tab === "non-lues") query.set("onglet", tab);
      if (page > 1) query.set("page", String(page));
      const search = query.toString();
      return search ? `/apprenant/notifications?${search}` : "/apprenant/notifications";
    },
    notificationPreferences: "/apprenant/notifications/preferences",
    attempts: "/apprenant/quiz",
    attempt: (id: number | string) => `/apprenant/quiz/${id}`,
    help: "/apprenant/aide",
    events: "/apprenant/evenements",
    courses: "/apprenant/parcours",
    course: (slug: string) => `/apprenant/parcours/${slug}`,
    project: (slug: string, id: number | string) => `/apprenant/parcours/${slug}/projets/${id}`,
    level: (slug: string, id: number | string) => `/apprenant/parcours/${slug}/niveaux/${id}`,
    mission: (slug: string, id: number | string) => `/apprenant/parcours/${slug}/missions/${id}`,
    quiz: (slug: string, id: number | string) => `/apprenant/parcours/${slug}/quiz/${id}`,
    quizResult: (slug: string, quizId: number | string, attemptId: number | string) =>
      `/apprenant/parcours/${slug}/quiz/${quizId}/resultats/${attemptId}`,
    levelBadge: (slug: string, id: number | string) => `/apprenant/parcours/${slug}/niveaux/${id}/badge`,
    projectBadge: (slug: string, id: number | string) => `/apprenant/parcours/${slug}/projets/${id}/badge`,
    certification: (slug: string) => `/apprenant/parcours/${slug}/certification`,
    catalog: "/apprenant/catalogue",
    /** Catalogue filtré sur les parcours gratuits (WD02, W15, D27). */
    freeCatalog: "/apprenant/catalogue?prix=gratuit",
    /** Catalogue filtré par une recherche (`q`, recherche du header). */
    catalogSearch: (q: string) => `/apprenant/catalogue?q=${encodeURIComponent(q)}`,
    catalogCourse: (slug: string) => `/apprenant/catalogue/${slug}`,
    /** WA01 / WA06 · saisie du Kit Code. */
    kitCode: (slug: string) => `/apprenant/catalogue/${slug}/kit-code`,
    /** WA02 / WK08 · demande de paiement au parent, créée depuis WC05 ou le panier. */
    request: (id: number | string) => `/apprenant/demandes/${id}`,
    wishlist: "/apprenant/souhaits",
    /** WK01 · boutique de kits dans le shell. */
    shop: "/apprenant/boutique",
    shopKit: (slug: string) => `/apprenant/boutique/${slug}`,
    cart: "/apprenant/boutique/panier",
    profile: "/apprenant/profil",
    editProfile: "/apprenant/profil/modifier",
    password: "/apprenant/profil/mot-de-passe",
    delivery: "/apprenant/profil/livraison",
    orders: "/apprenant/profil/commandes",
    /** WD14 : filtre (`?statut=`) et page dans l'URL (« Toutes » et la page 1 n'y figurent pas). */
    orderList: (status?: string, page = 1) => {
      const query = new URLSearchParams();
      if (status) query.set("statut", status);
      if (page > 1) query.set("page", String(page));
      const search = query.toString();
      return search ? `/apprenant/profil/commandes?${search}` : "/apprenant/profil/commandes";
    },
    progress: "/apprenant/profil/progression",
    parent: "/apprenant/profil/parent",
    deletion: "/apprenant/profil/suppression",
  },
  // Back-office Next.js (lot 6, WAD01-WAD05)
  backoffice: {
    home: "/backoffice",
    impact: "/backoffice/impact",
    kpi: (code: string) => `/backoffice/impact/indicateurs/${encodeURIComponent(code)}`,
    reports: "/backoffice/impact/rapports",
    report: (period: string) => `/backoffice/impact/rapports/${encodeURIComponent(period)}`,
    reportEntry: (period: string) => `/backoffice/impact/rapports/${encodeURIComponent(period)}/saisie`,
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
