import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { PaginationNav } from "./PaginationNav";

const hrefFor = (page: number) => `/backoffice/paiements?statut=failed&page=${page}`;

describe("PaginationNav", () => {
  it("ne s'affiche pas quand tout tient sur une page", () => {
    const { container } = render(<PaginationNav page={1} hasPrevious={false} hasNext={false} hrefFor={hrefFor} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("propose page précédente et suivante, filtres conservés, page courante annoncée", async () => {
    const { container } = render(<PaginationNav page={2} hasPrevious hasNext hrefFor={hrefFor} summary="42 paiements" />);
    expect(screen.getByRole("navigation", { name: "Pagination" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Précédent" })).toHaveAttribute("href", "/backoffice/paiements?statut=failed&page=1");
    expect(screen.getByRole("link", { name: "Suivant" })).toHaveAttribute("href", "/backoffice/paiements?statut=failed&page=3");
    expect(screen.getByText("Page 2")).toHaveAttribute("aria-current", "page");
    expect(screen.getByText(/42 paiements/)).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("désactive le sens qui n'existe pas", () => {
    render(<PaginationNav page={1} hasPrevious={false} hasNext hrefFor={hrefFor} />);
    expect(screen.queryByRole("link", { name: "Précédent" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Suivant" })).toBeInTheDocument();
  });

  it("n'offre pas « Suivant » sur la dernière page", () => {
    render(<PaginationNav page={3} hasPrevious hasNext={false} hrefFor={hrefFor} />);
    expect(screen.getByRole("link", { name: "Précédent" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Suivant" })).not.toBeInTheDocument();
  });
});
