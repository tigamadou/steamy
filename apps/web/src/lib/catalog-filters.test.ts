import { describe, expect, it } from "vitest";

import { catalogHref, parseCatalogFilters } from "./catalog-filters";

describe("filtres du catalogue ↔ URL", () => {
  it("lit la catégorie et la page", () => {
    expect(parseCatalogFilters({ categorie: "robotique", page: "2" })).toEqual({ category: "robotique", page: 2 });
    expect(parseCatalogFilters({ categorie: ["code", "ia"] })).toEqual({ category: "code", page: 1 });
  });

  it("ignore les valeurs invalides", () => {
    expect(parseCatalogFilters({ categorie: "<script>", page: "-3" })).toEqual({ category: undefined, page: 1 });
    expect(parseCatalogFilters({ page: "abc" })).toEqual({ category: undefined, page: 1 });
    expect(parseCatalogFilters({})).toEqual({ category: undefined, page: 1 });
  });

  it("écrit l'URL sans paramètre superflu, et relit ce qu'elle écrit", () => {
    expect(catalogHref({})).toBe("/parcours");
    expect(catalogHref({ category: "robotique" })).toBe("/parcours?categorie=robotique");
    expect(catalogHref({ category: "code", page: 3 })).toBe("/parcours?categorie=code&page=3");
    expect(catalogHref({ page: 2 })).toBe("/parcours?page=2");
    const href = catalogHref({ category: "ia", page: 4 });
    expect(parseCatalogFilters(Object.fromEntries(new URL(href, "http://x").searchParams))).toEqual({
      category: "ia",
      page: 4,
    });
  });
});
