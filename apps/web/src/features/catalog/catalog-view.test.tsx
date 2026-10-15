import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CATEGORY, course } from "@/test/api-fixtures";

vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));
const getCategories = vi.fn();
const getCourses = vi.fn();
vi.mock("@/lib/catalog", () => ({ getCategories, getCourses }));
const getLearnerCourseState = vi.fn();
vi.mock("./learner-state", () => ({ getLearnerCourseState }));

const { LearnerCatalog, LearnerCatalogSkeleton } = await import("./catalog-view");

const CODE = { ...CATEGORY, slug: "code", label: "Code", courseCount: 1 };
const ENERGY = { ...CATEGORY, slug: "energie", label: "Énergie", courseCount: 0 };

async function show(searchParams: Record<string, string>, results = [course()], count = results.length) {
  getCategories.mockResolvedValue([CATEGORY, CODE, ENERGY]);
  getCourses.mockResolvedValue({ count, results, hasNext: count > results.length });
  getLearnerCourseState.mockResolvedValue({ wished: [], progress: { "decouverte-robotique": 35 } });
  render(await LearnerCatalog({ searchParams: Promise.resolve(searchParams) }));
}

describe("WC01 · catalogue par défaut", () => {
  it("compteur réel, catégories, tri, cartes vers WC04 avec la progression", async () => {
    await show({}, [course(), course({ slug: "robot-bluetooth", title: "Robot", requiredKit: { slug: "bot", name: "Bot" } })], 12);
    expect(getCourses).toHaveBeenCalledWith({
      q: undefined,
      category: undefined,
      difficulty: undefined,
      price: undefined,
      sort: "popular",
      page: 1,
    });
    expect(screen.getByText("12 parcours")).toBeInTheDocument();
    expect(screen.getByText(/· 2 catégories · pour les 10-17 ans/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Toutes" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: /Trier par/ })).toHaveTextContent("Plus populaires");
    expect(screen.getByRole("button", { name: /Difficulté/ })).toHaveTextContent("Toutes");
    expect(screen.getByRole("button", { name: /Prix/ })).toHaveTextContent("Tous");
    expect(screen.queryByText("Effacer les filtres")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Découverte de la robotique" })).toHaveAttribute(
      "href",
      "/apprenant/catalogue/decouverte-robotique",
    );
    expect(screen.getByRole("progressbar", { name: "Ta progression" })).toHaveAttribute("aria-valuenow", "35");
    // Parcours à kit : jamais de prix de parcours (D36)
    expect(screen.getByText("Avec le Kit Code")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Suivant" })).toHaveAttribute("href", "/apprenant/catalogue?page=2");
  });
});

describe("WC02 · filtres actifs", () => {
  it("puces retirables, filtres dans l'URL, pagination qui les garde", async () => {
    await show({ q: "robot", categorie: "robotique", difficulte: "debutant", prix: "gratuit", tri: "recents", page: "2" });
    expect(getCourses).toHaveBeenLastCalledWith({
      q: "robot",
      category: "robotique",
      difficulty: "beginner",
      price: "free",
      sort: "recent",
      page: 2,
    });
    const filters = screen.getByRole("list", { name: "Filtres actifs" });
    expect(within(filters).getAllByRole("link").map((link) => link.getAttribute("aria-label"))).toEqual([
      "Retirer le filtre « robot »",
      "Retirer le filtre Robotique",
      "Retirer le filtre Débutant",
      "Retirer le filtre Gratuit",
    ]);
    expect(screen.getByRole("link", { name: "Retirer le filtre Robotique" })).toHaveAttribute(
      "href",
      "/apprenant/catalogue?q=robot&difficulte=debutant&prix=gratuit&tri=recents",
    );
    expect(screen.getByRole("link", { name: "Effacer les filtres" })).toHaveAttribute(
      "href",
      "/apprenant/catalogue?tri=recents",
    );
    expect(screen.getByRole("heading", { level: 2, name: "Parcours : Robotique" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Difficulté/ })).toHaveTextContent("Débutant");
    expect(screen.getByRole("button", { name: /Prix/ })).toHaveTextContent("Gratuit");
    expect(screen.getByRole("link", { name: "Précédent" })).toHaveAttribute(
      "href",
      "/apprenant/catalogue?q=robot&categorie=robotique&difficulte=debutant&prix=gratuit&tri=recents",
    );
  });

  it("une catégorie inconnue est ignorée", async () => {
    await show({ categorie: "disparue" });
    expect(getCourses).toHaveBeenLastCalledWith(expect.objectContaining({ category: undefined }));
    expect(screen.getByRole("heading", { level: 2, name: "Tous les parcours" })).toBeInTheDocument();
  });
});

describe("WC03 · aucun résultat", () => {
  it("« Effacer les filtres » et « Voir toutes les catégories »", async () => {
    await show({ categorie: "energie", prix: "payant" }, []);
    expect(screen.getByRole("heading", { level: 3, name: "Aucun parcours ne correspond" })).toBeInTheDocument();
    // Dans la barre des filtres actifs et dans l'état vide, comme sur la maquette
    for (const link of screen.getAllByRole("link", { name: "Effacer les filtres" })) {
      expect(link).toHaveAttribute("href", "/apprenant/catalogue");
    }
    expect(screen.getByRole("link", { name: "Voir toutes les catégories" })).toHaveAttribute(
      "href",
      "/apprenant/catalogue?prix=payant",
    );
  });

  it("sans catégorie filtrée, pas de « Voir toutes les catégories »", async () => {
    await show({ difficulte: "avance" }, []);
    expect(screen.queryByRole("link", { name: "Voir toutes les catégories" })).not.toBeInTheDocument();
  });

  it("catalogue vide sans filtre : pas de bouton d'effacement", async () => {
    await show({}, []);
    expect(screen.getByText("Aucun parcours pour le moment")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Effacer les filtres" })).not.toBeInTheDocument();
  });

  it("une seule catégorie peuplée : singulier", async () => {
    getCategories.mockResolvedValue([CATEGORY]);
    getCourses.mockResolvedValue({ count: 1, results: [course()], hasNext: false });
    getLearnerCourseState.mockResolvedValue({ wished: [], progress: {} });
    render(await LearnerCatalog({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText(/· 1 catégorie ·/)).toBeInTheDocument();
  });
});

describe("chargement", () => {
  it("silhouette verbalisée", () => {
    render(<LearnerCatalogSkeleton />);
    expect(screen.getByRole("status", { name: "Chargement des parcours…" })).toBeInTheDocument();
  });
});
