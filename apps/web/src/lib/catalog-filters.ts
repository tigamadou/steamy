import { routes } from "./routes";

// État des filtres de WL06 dans l'URL (`/parcours?categorie=<slug>&page=<n>`) : partageable, indexable.

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

/** URL de WL06 pour des filtres donnés (la page 1 et « Tous » n'apparaissent pas). */
export function catalogHref({ category, page = 1 }: Partial<CatalogFilters>): string {
  const query = new URLSearchParams();
  if (category) {
    query.set("categorie", category);
  }
  if (page > 1) {
    query.set("page", String(page));
  }
  const search = query.toString();
  return search ? `${routes.courses}?${search}` : routes.courses;
}
