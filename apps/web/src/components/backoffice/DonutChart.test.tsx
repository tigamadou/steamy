import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { DonutChart, ratio } from "./DonutChart";

describe("DonutChart", () => {
  it("affiche la part et la nomme", () => {
    render(<DonutChart value={65} total={220} label="Femmes parmi les nouveaux apprenants" caption="femmes" />);
    expect(screen.getByRole("img", { name: "Femmes parmi les nouveaux apprenants : 30 %" })).toBeInTheDocument();
    expect(screen.getByText("femmes")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "220" })).toBeInTheDocument();
  });

  it("accepte un texte central", () => {
    render(<DonutChart value={2} total={5} label="Femmes employées" display="2/5" />);
    expect(screen.getByText("2/5")).toBeInTheDocument();
  });

  it("borne la part et traite un total nul", () => {
    expect(ratio(5, 0)).toBe(0);
    expect(ratio(-1, 10)).toBe(0);
    expect(ratio(15, 10)).toBe(1);
    render(<DonutChart value={0} total={0} label="Vide" />);
    expect(screen.getByRole("img", { name: "Vide : 0 %" })).toBeInTheDocument();
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(<DonutChart value={1} total={4} label="Part" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
