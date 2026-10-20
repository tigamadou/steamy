import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { ConsentRequestCard, type ConsentRequestCardProps } from ".";

const PROPS: ConsentRequestCardProps = {
  firstName: "Awa",
  lastName: "Koffi",
  username: "awa.k",
  age: 12,
  relationship: "Vous êtes sa mère",
  expiresOn: "22 octobre 2026",
};

describe("ConsentRequestCard", () => {
  it("affiche seulement les champs autorisés par D20", () => {
    render(<ConsentRequestCard {...PROPS} className="mt-4" />);
    const card = screen.getByRole("article", { name: "Demande de Awa Koffi" });
    expect(card).toHaveClass("mt-4");
    expect(within(card).getByRole("heading", { level: 2 })).toHaveTextContent("Awa Koffi");
    expect(within(card).getByText("@awa.k · 12 ans")).toBeInTheDocument();
    expect(within(card).getByText("En attente")).toBeInTheDocument();
    expect(within(card).getByText("Vous êtes sa mère")).toBeInTheDocument();
    expect(within(card).getByText("Demande valable jusqu'au 22 octobre 2026.")).toBeInTheDocument();
    expect(within(card).getByText(/jamais à du marketing/)).toBeInTheDocument();
    // Initiales, aucun emoji d'avatar ni image nommée
    expect(within(card).getByText("AK")).toBeInTheDocument();
    expect(within(card).queryByRole("img")).not.toBeInTheDocument();
  });

  it("omet l'identifiant ou l'âge absents", () => {
    const { rerender } = render(<ConsentRequestCard {...PROPS} username={null} />);
    expect(screen.getByText("12 ans")).toBeInTheDocument();
    expect(screen.queryByText(/@/)).not.toBeInTheDocument();
    rerender(<ConsentRequestCard {...PROPS} age={null} />);
    expect(screen.getByText("@awa.k")).toBeInTheDocument();
    expect(screen.queryByText(/ans/)).not.toBeInTheDocument();
  });

  it("affiche le statut d'une demande close, sans date d'expiration", () => {
    render(<ConsentRequestCard {...PROPS} expiresOn={undefined} badge={{ label: "Refusée", tone: "error" }} />);
    expect(screen.getByText("Refusée")).toBeInTheDocument();
    expect(screen.queryByText("En attente")).not.toBeInTheDocument();
    expect(screen.queryByText(/valable jusqu/)).not.toBeInTheDocument();
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(<ConsentRequestCard {...PROPS} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
