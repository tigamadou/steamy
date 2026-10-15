import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { BarChart } from "./BarChart";

describe("BarChart", () => {
  it("dessine une barre par valeur, la dernière mise en avant, avec l'axe des périodes", () => {
    const { container } = render(
      <BarChart data={[10, 0, -4, 20]} labels={["Oct", "Nov", "Déc", "Jan"]} label="Ventes par mois" />,
    );
    expect(screen.getByRole("img", { name: "Ventes par mois, 4 valeurs" })).toBeInTheDocument();
    const bars = container.querySelectorAll("rect");
    expect(bars).toHaveLength(4);
    expect([...bars].map((b) => b.getAttribute("opacity"))).toEqual(["0.3", "0.3", "0.3", "1"]);
    expect(bars[2].getAttribute("height")).toBe("2");
    expect(container.querySelectorAll("text")).toHaveLength(4);
  });

  it("donne les valeurs dans « Voir les données »", () => {
    render(<BarChart data={[1951472]} label="Financements" highlightLast={false} />);
    expect(screen.getByRole("img", { name: "Financements, 1 valeur" })).toBeInTheDocument();
    expect(screen.getByText("Voir les données")).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: "1" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: /^1\s951\s472$/ })).toBeInTheDocument();
  });

  it("garde une échelle quand toutes les valeurs sont nulles", () => {
    const { container } = render(<BarChart data={[0, 0]} label="Éducateurs" />);
    expect(container.querySelector("rect")?.getAttribute("height")).toBe("2");
  });

  it("annonce l'absence de données", () => {
    render(<BarChart data={[]} label="Ventes" />);
    expect(screen.getByText("Aucune donnée")).toBeInTheDocument();
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(<BarChart data={[1, 2]} labels={["a", "b"]} label="Ventes" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
