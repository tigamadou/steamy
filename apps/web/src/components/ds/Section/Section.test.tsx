import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { Section } from "./Section";

describe("Section", () => {
  it("région nommée par son titre h2", async () => {
    const { container } = render(
      <Section title="Connexion">
        <p>Contenu</p>
      </Section>,
    );
    expect(screen.getByRole("region", { name: "Connexion" })).toContainElement(screen.getByText("Contenu"));
    expect(screen.getByRole("heading", { level: 2, name: "Connexion" })).toHaveClass("text-ink-700");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("titre h3 et ton « danger » pour la zone sensible", () => {
    render(
      <Section title="Zone sensible" as="h3" tone="danger" className="mt-4">
        <p>Supprimer</p>
      </Section>,
    );
    expect(screen.getByRole("heading", { level: 3, name: "Zone sensible" })).toHaveClass("text-error-600");
    expect(screen.getByRole("region")).toHaveClass("mt-4");
  });
});
