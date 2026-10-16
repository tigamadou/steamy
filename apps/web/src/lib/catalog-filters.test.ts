import { describe, expect, it } from "vitest";

import {
  catalogHref,
  learnerCatalogHref,
  parseCatalogFilters,
  parseLearnerCatalogFilters,
  toCourseQuery,
  withFilter,
} from "./catalog-filters";

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

describe("filtres du catalogue de l'apprenant ↔ URL (WC01-WC03)", () => {
  it("lit catégorie, difficulté, prix, tri, recherche et page", () => {
    expect(
      parseLearnerCatalogFilters({
        q: "  robot ",
        categorie: "robotique",
        difficulte: "debutant",
        prix: "gratuit",
        tri: "recents",
        page: "2",
      }),
    ).toEqual({ q: "robot", category: "robotique", difficulty: "debutant", price: "gratuit", sort: "recents", page: 2 });
  });

  it("ignore les valeurs inconnues et applique le tri par défaut", () => {
    expect(
      parseLearnerCatalogFilters({ q: "   ", difficulte: "niveau-3", prix: "cher", tri: "toString" }),
    ).toEqual({ q: undefined, category: undefined, difficulty: undefined, price: undefined, sort: "populaires", page: 1 });
    expect(parseLearnerCatalogFilters({ q: "x".repeat(300) }).q).toHaveLength(100);
  });

  it("écrit l'URL sans valeur par défaut et relit ce qu'elle écrit", () => {
    expect(learnerCatalogHref({})).toBe("/apprenant/catalogue");
    expect(learnerCatalogHref({ sort: "populaires", page: 1 })).toBe("/apprenant/catalogue");
    const filters = {
      q: "robot et IA",
      category: "robotique",
      difficulty: "avance",
      price: "payant",
      sort: "recents",
      page: 3,
    } as const;
    const href = learnerCatalogHref(filters);
    expect(href).toBe(
      "/apprenant/catalogue?q=robot+et+IA&categorie=robotique&difficulte=avance&prix=payant&tri=recents&page=3",
    );
    expect(parseLearnerCatalogFilters(Object.fromEntries(new URL(href, "http://x").searchParams))).toEqual(filters);
  });

  it("un filtre changé ramène à la première page", () => {
    const filters = parseLearnerCatalogFilters({ categorie: "code", page: "4" });
    expect(withFilter(filters, { price: "gratuit" })).toBe("/apprenant/catalogue?categorie=code&prix=gratuit");
    expect(withFilter(filters, { category: undefined })).toBe("/apprenant/catalogue");
  });

  it("traduit les filtres en paramètres de l'API", () => {
    expect(toCourseQuery(parseLearnerCatalogFilters({ difficulte: "intermediaire", prix: "payant" }))).toEqual({
      q: undefined,
      category: undefined,
      difficulty: "intermediate",
      price: "paid",
      sort: "popular",
      page: 1,
    });
    expect(toCourseQuery(parseLearnerCatalogFilters({ tri: "recents" }))).toMatchObject({
      difficulty: undefined,
      price: undefined,
      sort: "recent",
    });
  });
});
