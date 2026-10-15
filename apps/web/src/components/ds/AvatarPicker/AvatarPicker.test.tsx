import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

import { AvatarPicker } from "./AvatarPicker";

const AVATARS = [
  { id: 1, code: "renard", label: "Renard", emoji: "🦊", color: "cat-mecanique" },
  { id: 2, code: "panda", label: "Panda", emoji: "🐼", color: "cat-ia" },
  { id: 3, code: "hibou", label: "Hibou", emoji: "🦉", color: "primary-500" },
];

describe("AvatarPicker", () => {
  it("présente une grille radio nommée par les libellés, aucun avatar présélectionné", () => {
    render(<AvatarPicker legend="Choisis ton avatar" name="avatar" avatars={AVATARS} onChange={() => {}} />);
    expect(screen.getByRole("group", { name: "Choisis ton avatar" })).toBeInTheDocument();
    const radios = screen.getAllByRole("radio");
    expect(radios.map((radio) => radio.getAttribute("value"))).toEqual(["renard", "panda", "hibou"]);
    radios.forEach((radio) => expect(radio).not.toBeChecked());
    const tile = screen.getByRole("radio", { name: "Panda" }).closest("label") as HTMLElement;
    expect(tile.style.getPropertyValue("--avatar-couleur")).toBe("var(--cat-ia)");
  });

  it("renvoie le code choisi et marque la tuile sélectionnée", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<AvatarPicker legend="Choisis ton avatar" name="avatar" avatars={AVATARS} onChange={onChange} />);
    await user.click(screen.getByText("Hibou").closest("label") as HTMLElement);
    expect(onChange).toHaveBeenCalledWith("hibou");
    const tile = screen.getByRole("radio", { name: "Hibou" }).closest("label") as HTMLElement;
    expect(tile.className).toContain("var(--amber-500)");
    expect(tile.querySelector("svg")).toBeInTheDocument();
    await user.keyboard("{ArrowLeft}");
    expect(onChange).toHaveBeenLastCalledWith("panda");
  });

  it("suit la valeur contrôlée", () => {
    render(<AvatarPicker legend="Avatar" name="avatar" avatars={AVATARS} value="renard" onChange={() => {}} />);
    expect(screen.getByRole("radio", { name: "Renard" })).toBeChecked();
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(
      <AvatarPicker legend="Avatar" legendHidden required name="avatar" avatars={AVATARS} value="panda" onChange={() => {}} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
