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

/**
 * Rappel sur WPD03 : enfant créé (WPD04), profil modifié (WPD10), compte désactivé, demande refusée ou suppression
 * annulée (WPD09).
 */
export type ChildConfirmation = "cree" | "modifie" | "supprime" | "demande-refusee" | "suppression-annulee";

/** Onglet de la liste des notifications (WD04, WPD14). */
export type NotificationTab = "toutes" | "non-lues";

/** Liste des notifications d'un espace : onglet « Non lues » et page dans l'URL (ni la page 1 ni « Toutes »). */
function notificationList(base: string) {
  return (tab: NotificationTab = "toutes", page = 1): string => {
    const query = new URLSearchParams();
    if (tab === "non-lues") query.set("onglet", tab);
    if (page > 1) query.set("page", String(page));
    const search = query.toString();
    return search ? `${base}?${search}` : base;
  };
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
    notificationList: notificationList("/apprenant/notifications"),
    notificationPreferences: "/apprenant/notifications/preferences",
    attempts: "/apprenant/quiz",
    attempt: (id: number | string) => `/apprenant/quiz/${id}`,
    help: "/apprenant/aide",
    events: "/apprenant/evenements",
    /** WL23 dans le shell. */
    event: (slug: string) => `/apprenant/evenements/${slug}`,
    /** WD11 · candidature à un événement. */
    eventApplication: (slug: string) => `/apprenant/evenements/${slug}/candidature`,
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
  // Espace parent (lot 4, LOT-4 « Arborescence des routes »)
  parent: {
    home: "/parent",
    children: "/parent/enfants",
    addChild: "/parent/enfants/ajouter",
    /** WPD02 après « Annuler la suppression » : confirmation et focus sur la ligne de l'enfant. */
    deletionCancelled: (id: number | string) => `/parent/enfants?annulation=${id}`,
    /** WPD03 ; `confirmation` : rappel après WPD04, WPD10 ou WPD09. */
    child: (id: number | string, confirmation?: ChildConfirmation) =>
      confirmation ? `/parent/enfants/${id}?confirmation=${confirmation}` : `/parent/enfants/${id}`,
    editChild: (id: number | string) => `/parent/enfants/${id}/modifier`,
    /** WPD11 : semaine ISO `AAAA-Www` dans l'URL, la semaine courante sans paramètre. */
    weeklyReport: (id: number | string, week?: string) =>
      week ? `/parent/enfants/${id}/rapport?semaine=${week}` : `/parent/enfants/${id}/rapport`,
    /** WPD09 : `?demande=<id>` pour valider la demande de suppression de l'enfant (WD15). */
    deleteChild: (id: number | string, request?: number | string) =>
      request !== undefined ? `/parent/enfants/${id}/supprimer?demande=${request}` : `/parent/enfants/${id}/supprimer`,
    consent: (id: number | string) => `/parent/consentements/${id}`,
    /** WPD01 après l'acceptation d'une demande (WPD05) : confirmation lue côté serveur, aucun prénom dans l'URL. */
    consentAccepted: (id: number | string) => `/parent?consentement=${id}`,
    paymentRequest: (id: number | string) => `/parent/demandes/${id}`,
    events: "/parent/evenements",
    event: (slug: string) => `/parent/evenements/${slug}`,
    /** WPD06 avec une candidature mise en avant (« À valider », notification). */
    eventApplication: (id: number | string) => `/parent/evenements?candidature=${id}`,
    eventSignup: (slug: string) => `/parent/evenements/${slug}/inscription`,
    orders: "/parent/commandes",
    /** WPD07 : filtre de statut (`?statut=`) et page dans l'URL (« Toutes » et la page 1 n'y figurent pas). */
    orderList: (filter?: string, page = 1) => {
      const query = new URLSearchParams();
      if (filter) query.set("statut", filter);
      if (page > 1) query.set("page", String(page));
      const search = query.toString();
      return search ? `/parent/commandes?${search}` : "/parent/commandes";
    },
    order: (reference: string) => `/parent/commandes/${reference}`,
    /** WK01-WK03 dans l'espace parent : achat direct de kit (C10). */
    shop: "/parent/boutique",
    shopKit: (slug: string) => `/parent/boutique/${slug}`,
    cart: "/parent/boutique/panier",
    /** Livraison puis paiement d'un achat direct de kit (WK05, WK06 au registre du parent). */
    checkout: "/parent/boutique/commande",
    notifications: "/parent/notifications",
    /** WPD14 : onglet « Non lues » et page de la liste dans l'URL (la page 1 et « Toutes » n'y figurent pas). */
    notificationList: notificationList("/parent/notifications"),
    settings: "/parent/parametres",
    help: "/parent/aide",
  },
  // Espace enseignant (lot 5, LOT-5 « Arborescence des routes »)
  teacher: {
    home: "/enseignant",
    /** WT02 · parcours encadrés. */
    courses: "/enseignant/parcours",
    course: (slug: string) => `/enseignant/parcours/${slug}`,
    /** Mission d'un parcours encadré, en lecture seule (WT10). */
    mission: (slug: string, id: number | string) => `/enseignant/parcours/${slug}/missions/${id}`,
    /** WT03 · mes classes. */
    classes: "/enseignant/classes",
    /** WT13 · création d'une classe. */
    newClassroom: "/enseignant/classes/nouvelle",
    /** WT04 · élèves d'une classe. */
    /** `confirmation` : rappel après la création ou la modification de la classe (WT13), ou l'envoi d'une demande (WT06). */
    classroom: (id: number | string, confirmation?: "creee" | "modifiee" | "invitation") =>
      confirmation ? `/enseignant/classes/${id}?confirmation=${confirmation}` : `/enseignant/classes/${id}`,
    /** WT13 · même formulaire en édition. */
    editClassroom: (id: number | string) => `/enseignant/classes/${id}/modifier`,
    /** WT06 · `classe` présélectionne la classe, `lot` ouvre l'onglet « Import par lot ». */
    addLearners: (options: { classroomId?: number | string; batch?: boolean } = {}) => {
      const query = new URLSearchParams();
      if (options.classroomId !== undefined) query.set("classe", String(options.classroomId));
      if (options.batch) query.set("onglet", "lot");
      const search = query.toString();
      return search ? `/enseignant/eleves/ajouter?${search}` : "/enseignant/eleves/ajouter";
    },
    /** WT05 · profil d'un élève dans une classe, éventuellement sur une tentative. */
    learner: (id: number | string, options: { classroomId?: number | string; attemptId?: number | string } = {}) => {
      const query = new URLSearchParams();
      if (options.classroomId !== undefined) query.set("classe", String(options.classroomId));
      if (options.attemptId !== undefined) query.set("tentative", String(options.attemptId));
      const search = query.toString();
      return search ? `/enseignant/eleves/${id}?${search}` : `/enseignant/eleves/${id}`;
    },
    /** WT07 · filtre (`?filtre=`), classe (`?classe=`) et page dans l'URL (« Toutes » et la page 1 n'y figurent pas). */
    reviews: (options: { filter?: string; classroomId?: number | string; page?: number } = {}) => {
      const query = new URLSearchParams();
      if (options.filter && options.filter !== "toutes") query.set("filtre", options.filter);
      if (options.classroomId !== undefined) query.set("classe", String(options.classroomId));
      if (options.page && options.page > 1) query.set("page", String(options.page));
      const search = query.toString();
      return search ? `/enseignant/evaluations?${search}` : "/enseignant/evaluations";
    },
    events: "/enseignant/evenements",
    /** WL23 dans le shell enseignant. */
    event: (slug: string) => `/enseignant/evenements/${slug}`,
    notifications: "/enseignant/notifications",
    /** WT12 : onglet « Non lues » et page de la liste dans l'URL (la page 1 et « Toutes » n'y figurent pas). */
    notificationList: notificationList("/enseignant/notifications"),
    settings: "/enseignant/parametres",
    help: "/enseignant/aide",
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
