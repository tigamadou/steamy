import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CATEGORY, course } from "@/test/api-fixtures";
import { axe } from "@/test/axe";

import { CatalogPagination, CategoryCard, CategoryFilters, CourseGrid, CourseGridSkeleton } from "./catalog";

describe("CategoryCard", () => {
  it("mène au catalogue filtré et affiche le nombre de parcours publiés", async () => {
    const { container } = render(<CategoryCard category={CATEGORY} />);
    expect(screen.getByRole("link", { name: "Robotique" })).toHaveAttribute("href", "/parcours?categorie=robotique");
    expect(screen.getByText("2 parcours")).toBeInTheDocument();
    expect(container.querySelector<HTMLElement>("[aria-hidden]")!.style.getPropertyValue("--category")).toBe("#5B3FE0");
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("CategoryFilters", () => {
  it("propose « Tous » puis chaque catégorie, l'active marquée", () => {
    render(<CategoryFilters categories={[CATEGORY, { ...CATEGORY, slug: "code", label: "Code" }]} active="code" />);
    const nav = within(screen.getByRole("navigation", { name: "Filtrer par catégorie" }));
    expect(nav.getAllByRole("link").map((l) => [l.textContent, l.getAttribute("href")])).toEqual([
      ["Tous", "/parcours"],
      ["Robotique", "/parcours?categorie=robotique"],
      ["Code", "/parcours?categorie=code"],
    ]);
    expect(nav.getByRole("link", { name: "Code" })).toHaveAttribute("aria-current", "true");
    expect(nav.getByRole("link", { name: "Tous" })).not.toHaveAttribute("aria-current");
  });

  it("active « Tous » sans filtre", () => {
    render(<CategoryFilters categories={[CATEGORY]} />);
    expect(screen.getByRole("link", { name: "Tous" })).toHaveAttribute("aria-current", "true");
  });
});

describe("CourseGrid", () => {
  it("affiche une carte par parcours, vers sa fiche", () => {
    render(
      <CourseGrid courses={[course(), course({ slug: "b", title: "Parcours B", isFree: false, price: 18000 })]} />,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Parcours B" })).toHaveAttribute("href", "/parcours/b");
    expect(screen.getByText("Gratuit")).toBeInTheDocument();
  });

  it("lie les cartes à une autre fiche quand on la fournit (espace apprenant)", () => {
    render(<CourseGrid courses={[course()]} courseHref={(slug) => `/apprenant/catalogue/${slug}`} />);
    expect(screen.getByRole("link", { name: "Découverte de la robotique" })).toHaveAttribute(
      "href",
      "/apprenant/catalogue/decouverte-robotique",
    );
  });

  it("skeleton : zone occupée, verbalisée", () => {
    render(<CourseGridSkeleton count={2} label="Chargement…" />);
    expect(screen.getByRole("status", { name: "Chargement…" })).toHaveAttribute("aria-busy", "true");
  });
});

describe("CatalogPagination", () => {
  it("disparaît quand tout tient sur une page", () => {
    const { container } = render(<CatalogPagination page={1} hasNext={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("relie les pages précédente et suivante en gardant le filtre", () => {
    render(<CatalogPagination category="code" page={2} hasNext />);
    expect(screen.getByRole("link", { name: "Précédent" })).toHaveAttribute("href", "/parcours?categorie=code");
    expect(screen.getByRole("link", { name: "Suivant" })).toHaveAttribute("href", "/parcours?categorie=code&page=3");
    expect(screen.getByText("Page 2")).toBeInTheDocument();
  });

  it("sans page précédente sur la première page", () => {
    render(<CatalogPagination page={1} hasNext />);
    expect(screen.queryByRole("link", { name: "Précédent" })).not.toBeInTheDocument();
  });
});
