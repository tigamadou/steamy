import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { Sparkline } from "./Sparkline";

describe("Sparkline", () => {
  it("dessine la tendance et la résume dans son nom accessible", () => {
    const { container } = render(<Sparkline data={[120, 150, 1200]} label="Nouveaux apprenants" area />);
    expect(screen.getByRole("img", { name: /^Nouveaux apprenants : de 120 à 1\s200$/ })).toBeInTheDocument();
    expect(container.querySelector("polyline")?.getAttribute("points")).toBe("0.0,25.0 48.0,24.4 96.0,3.0");
    expect(container.querySelector("polygon")).toBeInTheDocument();
    expect(screen.queryByText("Voir les données")).toBeNull();
  });

  it("trace un point seul et une série constante", () => {
    const { container, rerender } = render(<Sparkline data={[5]} label="Employés" />);
    expect(screen.getByRole("img", { name: "Employés : 5" })).toBeInTheDocument();
    expect(container.querySelector("circle")).toBeInTheDocument();
    rerender(<Sparkline data={[3, 3]} label="Employés" />);
    expect(container.querySelector("polyline")?.getAttribute("points")).toBe("0.0,25.0 96.0,25.0");
  });

  it("propose le tableau des valeurs", () => {
    render(<Sparkline data={[1, 2]} labels={["Déc", "Jan"]} label="Ventes" showData format={(v) => `${v} F`} />);
    expect(screen.getByRole("table", { name: "Ventes" })).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: "Jan" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "2 F" })).toBeInTheDocument();
  });

  it("numérote les points sans libellé", () => {
    render(<Sparkline data={[4]} label="Ventes" showData />);
    expect(screen.getByRole("rowheader", { name: "1" })).toBeInTheDocument();
  });

  it("annonce l'absence de données", () => {
    render(<Sparkline data={[]} label="Ventes" />);
    expect(screen.getByText("Aucune donnée")).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(<Sparkline data={[1, 3, 2]} labels={["a", "b", "c"]} label="Ventes" showData />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
