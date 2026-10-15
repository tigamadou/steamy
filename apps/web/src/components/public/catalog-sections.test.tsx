import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CATEGORY, course } from "@/test/api-fixtures";

vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));
const getCategories = vi.fn();
const getCourses = vi.fn();
const getHomeCourses = vi.fn();
vi.mock("@/lib/catalog", () => ({ getCategories, getCourses, getHomeCourses }));

const { Catalog, CatalogSkeleton, CategoryList, CategoryListSkeleton, HomeCourses } =
  await import("./catalog-sections");

const ENERGY = { ...CATEGORY, slug: "energie", label: "Énergie", courseCount: 0 };

describe("sections du catalogue", () => {
  it("accueil : trois parcours", async () => {
    getHomeCourses.mockResolvedValue([course({ slug: "a" }), course({ slug: "b" }), course({ slug: "c" })]);
    render(await HomeCourses());
    expect(screen.getAllByRole("article")).toHaveLength(3);
  });

  it("WL06 : filtre actif, grille et pagination", async () => {
    getCategories.mockResolvedValue([CATEGORY, ENERGY]);
    getCourses.mockResolvedValue({ count: 12, results: [course()], hasNext: true });
    render(await Catalog({ searchParams: Promise.resolve({ categorie: "robotique", page: "1" }) }));
    expect(getCourses).toHaveBeenCalledWith({ category: "robotique", page: 1 });
    expect(screen.getByRole("heading", { name: "Parcours : Robotique" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Suivant" })).toHaveAttribute(
      "href",
      "/parcours?categorie=robotique&page=2",
    );
  });

  it("WL06 : catégorie vide → message et « Voir tout »", async () => {
    getCategories.mockResolvedValue([CATEGORY, ENERGY]);
    getCourses.mockResolvedValue({ count: 0, results: [], hasNext: false });
    render(await Catalog({ searchParams: Promise.resolve({ categorie: "energie" }) }));
    expect(screen.getByText("Aucun parcours dans cette catégorie")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir tout" })).toHaveAttribute("href", "/parcours");
  });

  it("WL06 : une catégorie inconnue affiche tout le catalogue", async () => {
    getCategories.mockResolvedValue([CATEGORY]);
    getCourses.mockResolvedValue({ count: 1, results: [course()], hasNext: false });
    render(await Catalog({ searchParams: Promise.resolve({ categorie: "disparue" }) }));
    expect(getCourses).toHaveBeenLastCalledWith({ category: undefined, page: 1 });
    expect(screen.getByRole("heading", { name: "Tous les parcours" })).toBeInTheDocument();
  });

  it("WL16 : une carte par catégorie", async () => {
    getCategories.mockResolvedValue([CATEGORY, ENERGY]);
    render(await CategoryList());
    expect(screen.getByRole("link", { name: "Énergie" })).toHaveAttribute("href", "/parcours?categorie=energie");
  });

  it("skeletons verbalisés", () => {
    render(
      <>
        <CatalogSkeleton />
        <CategoryListSkeleton />
      </>,
    );
    expect(screen.getByRole("status", { name: "Chargement des parcours…" })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Chargement des catégories…" })).toBeInTheDocument();
  });
});
