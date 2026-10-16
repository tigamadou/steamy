import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SectionHeader } from "./SectionHeader";

describe("SectionHeader", () => {
  it("affiche un titre h2 et son lien d'action", () => {
    render(<SectionHeader id="pour-toi" title="Pour toi" action={{ label: "Voir tout", href: "/apprenant/catalogue" }} />);
    expect(screen.getByRole("heading", { level: 2, name: "Pour toi" })).toHaveAttribute("id", "pour-toi");
    expect(screen.getByRole("link", { name: "Voir tout" })).toHaveAttribute("href", "/apprenant/catalogue");
  });

  it("peut descendre d'un niveau, sans action", () => {
    render(<SectionHeader as="h3" title="Projets" />);
    expect(screen.getByRole("heading", { level: 3, name: "Projets" })).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
