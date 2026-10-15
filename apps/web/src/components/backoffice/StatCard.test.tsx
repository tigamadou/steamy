import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { StatCard } from "./StatCard";

describe("StatCard", () => {
  it("affiche le chiffre, la variation verbalisée et la tendance", () => {
    render(
      <StatCard
        label="Utilisateurs"
        value="1 240"
        sub="dont 220 ce mois"
        delta="+12 %"
        deltaTone="success"
        spark={[1, 2]}
        icon="👤"
      />,
    );
    const card = screen.getByRole("region", { name: "Utilisateurs" });
    expect(card).toHaveTextContent("1 240");
    expect(screen.getByText("dont 220 ce mois")).toBeInTheDocument();
    expect(screen.getByText("En hausse :")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Tendance · Utilisateurs : de 1 à 2" })).toBeInTheDocument();
  });

  it.each([
    ["error", "En baisse :"],
    ["neutral", "Stable :"],
  ] as const)("verbalise une variation %s", (tone, text) => {
    render(<StatCard label="Ventes" value="0" delta="0 %" deltaTone={tone} />);
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it("affiche un tiret sans valeur, sans tendance ni variation", () => {
    render(<StatCard label="Taux de complétion" spark={[]} />);
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.queryByText("Stable :")).toBeNull();
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(<StatCard label="Ventes" value="44 000" delta="+3 %" spark={[1, 3]} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
