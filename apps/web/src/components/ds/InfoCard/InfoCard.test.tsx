import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { InfoCard } from "./InfoCard";

describe("InfoCard", () => {
  it("liste de définitions, lien d'action nommé par la carte", async () => {
    const { container } = render(
      <InfoCard
        title="Mes informations"
        action={{ label: "Modifier", href: "/apprenant/profil/modifier" }}
        rows={[
          { label: "Classe", value: "4ᵉ" },
          { label: "Localité", value: "Cotonou" },
        ]}
      />,
    );
    expect(screen.getByRole("heading", { level: 3, name: "Mes informations" })).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /^Modifier\s*: Mes informations$/ });
    expect(link).toHaveAttribute("href", "/apprenant/profil/modifier");
    const terms = screen.getAllByRole("term").map((term) => term.textContent);
    expect(terms).toEqual(["Classe", "Localité"]);
    expect(screen.getAllByRole("definition")[0]).toHaveTextContent("4ᵉ");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("valeur absente : texte de repli ; sans action : lecture seule", () => {
    render(
      <InfoCard
        as="h2"
        title="Livraison"
        emptyLabel="À compléter"
        rows={[{ label: "Pays" }, { label: "Ville", value: null }, { label: "Quartier", value: "" }]}
      />,
    );
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Livraison");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    for (const definition of screen.getAllByRole("definition")) {
      expect(within(definition).getByText("À compléter")).toBeInTheDocument();
    }
  });

  it("repli par défaut « Non renseigné »", () => {
    render(<InfoCard title="Profil" rows={[{ label: "Email" }]} />);
    expect(screen.getByRole("definition")).toHaveTextContent("Non renseigné");
  });
});
