import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

import { GoalChip, GoalChipGroup, type GoalChipGroupProps } from "./GoalChip";

const OBJECTIFS = [
  { value: "robots", emoji: "🤖", label: "Construire des robots" },
  { value: "code", emoji: "💻", label: "Apprendre à coder" },
  { value: "ia", label: "Découvrir l'IA" },
];

function Harness(props: Partial<GoalChipGroupProps>) {
  const [value, setValue] = useState<string[]>([]);
  return <GoalChipGroup legend="Tes objectifs" name="objectifs" options={OBJECTIFS} value={value} onChange={setValue} {...props} />;
}

describe("GoalChip", () => {
  it("est une case à cocher native nommée par son libellé, emoji décoratif", async () => {
    const user = userEvent.setup();
    render(<GoalChip label="Domotique" emoji="📡" />);
    const checkbox = screen.getByRole("checkbox", { name: "Domotique" });
    expect(checkbox).not.toBeChecked();
    await user.click(screen.getByText("Domotique"));
    expect(checkbox).toBeChecked();
  });

  it("accepte un identifiant fourni", () => {
    render(<GoalChip id="mon-objectif" label="Créer un jeu" />);
    expect(screen.getByRole("checkbox", { name: "Créer un jeu" })).toHaveAttribute("id", "mon-objectif");
  });
});

describe("GoalChipGroup", () => {
  it("coche et décoche au clic et au clavier, sans limite imposée", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    function Spy() {
      const [value, setValue] = useState<string[]>(["ia"]);
      return (
        <GoalChipGroup
          legend="Tes objectifs"
          name="objectifs"
          options={OBJECTIFS}
          value={value}
          onChange={(next) => {
            onChange(next);
            setValue(next);
          }}
        />
      );
    }
    render(<Spy />);
    expect(screen.getByRole("group", { name: "Tes objectifs" })).toBeInTheDocument();
    await user.click(screen.getByText("Construire des robots"));
    expect(onChange).toHaveBeenLastCalledWith(["ia", "robots"]);
    await user.tab();
    expect(screen.getByRole("checkbox", { name: "Apprendre à coder" })).toHaveFocus();
    await user.keyboard(" ");
    expect(onChange).toHaveBeenLastCalledWith(["ia", "robots", "code"]);
    await user.click(screen.getByRole("checkbox", { name: "Découvrir l'IA" }));
    expect(onChange).toHaveBeenLastCalledWith(["robots", "code"]);
    expect(screen.getByRole("checkbox", { name: "Découvrir l'IA" })).not.toBeChecked();
  });

  it("annonce le nombre choisi face au minimum", async () => {
    const user = userEvent.setup();
    render(<Harness min={2} />);
    const group = screen.getByRole("group", { name: "Tes objectifs" });
    expect(group).toHaveAccessibleDescription("0 choisi · 2 minimum");
    await user.click(screen.getByText("Apprendre à coder"));
    expect(group).toHaveAccessibleDescription("1 choisi · 2 minimum");
    await user.click(screen.getByText("Découvrir l'IA"));
    expect(group).toHaveAccessibleDescription("2 choisis · 2 minimum");
  });

  it("accepte un compteur personnalisé, une légende masquée et une erreur", () => {
    render(
      <Harness
        min={2}
        legendHidden
        countLabel={(count, min) => `${count}/${min}`}
        error="Choisis au moins 2 objectifs"
      />,
    );
    const group = screen.getByRole("group", { name: "Tes objectifs" });
    expect(group).toHaveAccessibleDescription("0/2 Choisis au moins 2 objectifs");
    expect(group.querySelector("legend")).toHaveClass("sr-only");
    expect(screen.getByRole("checkbox", { name: "Apprendre à coder" })).toHaveAttribute("aria-invalid", "true");
  });

  it("n'a pas de description sans minimum ni erreur", () => {
    render(<Harness />);
    expect(screen.getByRole("group")).not.toHaveAttribute("aria-describedby");
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(
      <div>
        <Harness min={2} />
        <Harness error="Requis" />
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
