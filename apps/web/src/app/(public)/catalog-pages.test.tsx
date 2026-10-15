import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Sections asynchrones remplacées par des marqueurs : les pages ne font que les placer sous Suspense.
vi.mock("@/components/public/catalog-sections", () => ({
  HomeCourses: () => <p>parcours de l&apos;accueil</p>,
  Catalog: () => <p>catalogue</p>,
  CatalogSkeleton: () => null,
  CategoryList: () => <p>catégories</p>,
  CategoryListSkeleton: () => null,
}));

const home = await import("./page");
const courses = await import("./parcours/page");
const categories = await import("./categories/page");

describe("WL01 · accueil", () => {
  it("hero, chiffres, piliers, parcours, ancre « Comment ça marche » et CTA", () => {
    const { container } = render(home.default());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Apprends à construire les robots de demain.");
    expect(screen.getByRole("link", { name: "Comment ça marche" })).toHaveAttribute("href", "/#comment-ca-marche");
    expect(container.querySelector("#comment-ca-marche")).toContainElement(
      screen.getByRole("heading", { name: "Comment ça marche" }),
    );
    expect(screen.getByText("parcours de l'accueil")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Explorer tout le catalogue" })).toHaveAttribute("href", "/parcours");
    expect(screen.getByRole("link", { name: "Voir la boutique" })).toHaveAttribute("href", "/boutique");
    expect(screen.getByRole("link", { name: "Créer un compte parent" })).toHaveAttribute("href", "/inscription/parent");
    expect(screen.getByRole("link", { name: "Rejoindre l'équipe" })).toHaveAttribute(
      "href",
      "/aide?sujet=candidature#contact",
    );
    expect(screen.getByRole("link", { name: "J'ai déjà un compte" })).toHaveAttribute("href", "/connexion");
    expect(screen.getAllByText("1 000+")).toHaveLength(2);
    expect(screen.queryByText(/hors ligne/i)).not.toBeInTheDocument();
  });
});

describe("WL06 · catalogue", () => {
  it("titre, lien vers les catégories, catalogue et bandeau d'inscription", () => {
    render(courses.default({ searchParams: Promise.resolve({}) } as PageProps<"/parcours">));
    expect(screen.getByRole("heading", { level: 1, name: "Catalogue des parcours" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Toutes les catégories" })).toHaveAttribute("href", "/categories");
    expect(screen.getByText("catalogue")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Créer un compte" })).toHaveAttribute("href", "/inscription");
    expect(courses.metadata.title).toBe("Catalogue des parcours");
  });
});

describe("WL16 · catégories", () => {
  it("titre et liste des catégories", () => {
    render(categories.default());
    expect(screen.getByRole("heading", { level: 1, name: "Explore par catégorie" })).toBeInTheDocument();
    expect(screen.getByText("catégories")).toBeInTheDocument();
    expect(categories.metadata.title).toBe("Catégories");
  });
});
