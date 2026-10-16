import { routes } from "./routes";

// État des filtres de WL06 et WL07 dans l'URL (`/parcours?categorie=<slug>&page=<n>`) : partageable, indexable.

export type CatalogFilters = { category?: string; page: number };

type SearchParams = Record<string, string | string[] | undefined>;

const SLUG = /^[-a-z0-9_]+$/i;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Lit les filtres de l'URL ; une valeur invalide est ignorée (catégorie) ou ramenée à 1 (page). */
export function parseCatalogFilters(searchParams: SearchParams): CatalogFilters {
  const category = first(searchParams.categorie);
  const page = Number(first(searchParams.page));
  return {
    category: category && SLUG.test(category) ? category : undefined,
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

/** URL d'une liste filtrée (la page 1 et « Tous » n'apparaissent pas). */
export function listHref(base: string, { category, page = 1 }: Partial<CatalogFilters>): string {
  const query = new URLSearchParams();
  if (category) {
    query.set("categorie", category);
  }
  if (page > 1) {
    query.set("page", String(page));
  }
  const search = query.toString();
  return search ? `${base}?${search}` : base;
}

/** URL de WL06 pour des filtres donnés. */
export function catalogHref(filters: Partial<CatalogFilters>): string {
  return listHref(routes.courses, filters);
}

// Catalogue de l'apprenant (WC01-WC03) : catégorie × difficulté × prix + tri + recherche, tous dans l'URL
// (`/apprenant/catalogue?q=robot&categorie=robotique&difficulte=debutant&prix=gratuit&tri=recents&page=2`).

/** Difficulté dans l'URL (S2 : « difficulté », jamais « niveau ») → valeur de l'API. */
export const DIFFICULTY_PARAMS = { debutant: "beginner", intermediaire: "intermediate", avance: "advanced" } as const;
/** Prix dans l'URL → valeur de l'API. */
export const PRICE_PARAMS = { gratuit: "free", payant: "paid" } as const;
/** Tri dans l'URL → valeur de l'API ; « populaires » est le tri par défaut. */
export const SORT_PARAMS = { populaires: "popular", recents: "recent" } as const;

export type DifficultyParam = keyof typeof DIFFICULTY_PARAMS;
export type PriceParam = keyof typeof PRICE_PARAMS;
export type SortParam = keyof typeof SORT_PARAMS;

export type LearnerCatalogFilters = {
  q?: string;
  category?: string;
  difficulty?: DifficultyParam;
  price?: PriceParam;
  sort: SortParam;
  page: number;
};

/** Longueur maximale de la recherche relayée à l'API. */
const MAX_QUERY = 100;

function oneOf<T extends string>(table: Record<T, unknown>, value: string | undefined): T | undefined {
  return value !== undefined && Object.hasOwn(table, value) ? (value as T) : undefined;
}

/** Lit les filtres de WC01 dans l'URL ; une valeur inconnue est ignorée. */
export function parseLearnerCatalogFilters(searchParams: SearchParams): LearnerCatalogFilters {
  const { category, page } = parseCatalogFilters(searchParams);
  const q = first(searchParams.q)?.trim().slice(0, MAX_QUERY);
  return {
    q: q || undefined,
    category,
    difficulty: oneOf(DIFFICULTY_PARAMS, first(searchParams.difficulte)),
    price: oneOf(PRICE_PARAMS, first(searchParams.prix)),
    sort: oneOf(SORT_PARAMS, first(searchParams.tri)) ?? "populaires",
    page,
  };
}

/** URL de WC01 pour des filtres donnés (valeurs par défaut omises : tri « populaires », page 1). */
export function learnerCatalogHref(filters: Partial<LearnerCatalogFilters>): string {
  const query = new URLSearchParams();
  const entries: Array<[string, string | undefined]> = [
    ["q", filters.q],
    ["categorie", filters.category],
    ["difficulte", filters.difficulty],
    ["prix", filters.price],
    ["tri", filters.sort === "populaires" ? undefined : filters.sort],
    ["page", filters.page && filters.page > 1 ? String(filters.page) : undefined],
  ];
  for (const [name, value] of entries) {
    if (value) query.set(name, value);
  }
  const search = query.toString();
  return search ? `${routes.learner.catalog}?${search}` : routes.learner.catalog;
}

/** Même liste avec un filtre changé : toute modification ramène à la première page. */
export function withFilter(filters: LearnerCatalogFilters, change: Partial<LearnerCatalogFilters>): string {
  return learnerCatalogHref({ ...filters, page: 1, ...change });
}

/** Paramètres de `GET catalog/courses/` pour ces filtres. */
export function toCourseQuery(filters: LearnerCatalogFilters) {
  return {
    q: filters.q,
    category: filters.category,
    difficulty: filters.difficulty && DIFFICULTY_PARAMS[filters.difficulty],
    price: filters.price && PRICE_PARAMS[filters.price],
    sort: SORT_PARAMS[filters.sort],
    page: filters.page,
  };
}
