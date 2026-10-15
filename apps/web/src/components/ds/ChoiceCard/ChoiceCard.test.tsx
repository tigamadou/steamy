import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

import { ChoiceCardGroup } from "./ChoiceCard";

const GENRES = [
  { value: "female", emoji: "👧", label: "Fille" },
  { value: "male", emoji: "👦", label: "Garçon" },
  { value: "other", label: "Autre" },
];

describe("ChoiceCardGroup", () => {
  it("expose un groupe radio nommé par sa légende, sans sélection par défaut", () => {
    render(<ChoiceCardGroup legend="Genre" name="genre" options={GENRES} />);
    const group = screen.getByRole("group", { name: "Genre" });
    expect(group.tagName).toBe("FIELDSET");
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    screen.getAllByRole("radio").forEach((radio) => expect(radio).not.toBeChecked());
    expect(screen.getByRole("radio", { name: "Fille" })).toHaveAttribute("name", "genre");
  });

  it("se sélectionne au clic (non contrôlé) et au clavier avec les flèches", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ChoiceCardGroup legend="Genre" name="genre" options={GENRES} defaultValue="female" onChange={onChange} />);
    expect(screen.getByRole("radio", { name: "Fille" })).toBeChecked();
    await user.click(screen.getByText("Garçon"));
    expect(screen.getByRole("radio", { name: "Garçon" })).toBeChecked();
    expect(onChange).toHaveBeenLastCalledWith("male");
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Autre" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Autre" })).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith("other");
  });

  it("habille la carte sélectionnée en primaire", async () => {
    const user = userEvent.setup();
    render(<ChoiceCardGroup legend="Genre" name="genre" options={GENRES} />);
    const card = screen.getByText("Fille").closest("label") as HTMLElement;
    expect(card).toHaveClass("bg-surface");
    await user.click(card);
    expect(card).toHaveClass("bg-primary-500", "text-white");
  });

  it("suit la valeur contrôlée", async () => {
    function Controlled() {
      const [value, setValue] = useState("male");
      return (
        <>
          <ChoiceCardGroup legend="Genre" name="genre" options={GENRES} value={value} onChange={setValue} />
          <button type="button" onClick={() => setValue("other")}>
            Forcer
          </button>
        </>
      );
    }
    const user = userEvent.setup();
    render(<Controlled />);
    expect(screen.getByRole("radio", { name: "Garçon" })).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Forcer" }));
    expect(screen.getByRole("radio", { name: "Autre" })).toBeChecked();
  });

  it("annonce l'obligation et l'erreur, légende masquée possible", () => {
    render(
      <ChoiceCardGroup legend="Genre" legendHidden required error="Choisis une option" name="genre" options={GENRES} />,
    );
    const group = screen.getByRole("group", { name: /^Genre\s*\(obligatoire\)$/ });
    expect(group).toHaveAccessibleDescription("Choisis une option");
    expect(group.querySelector("legend")).toHaveClass("sr-only");
    expect(screen.getByRole("radio", { name: "Fille" })).toBeRequired();
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(
      <div>
        <ChoiceCardGroup legend="Genre" name="a" options={GENRES} defaultValue="male" />
        <ChoiceCardGroup legend="Genre" name="b" options={GENRES} required error="Requis" />
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
