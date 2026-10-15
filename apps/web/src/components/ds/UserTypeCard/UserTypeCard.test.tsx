import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

import { UserTypeCardGroup } from "./UserTypeCard";

const PROFILS = [
  { value: "learner", emoji: "🧒", title: "Apprenant", description: "J'ai entre 10 et 17 ans", color: "primary-500" },
  { value: "parent", emoji: "👨‍👩‍👧", title: "Parent", description: "J'accompagne mon enfant", color: "cat-ia", tone: "light" as const },
];

describe("UserTypeCardGroup", () => {
  it("nomme chaque radio par son titre et la décrit par son sous-titre", () => {
    render(<UserTypeCardGroup legend="Tu es… ?" name="profil" options={PROFILS} />);
    const radio = screen.getByRole("radio", { name: "Apprenant" });
    expect(radio).toHaveAccessibleDescription("J'ai entre 10 et 17 ans");
    const card = radio.closest("label") as HTMLElement;
    expect(card.style.getPropertyValue("--choix-couleur")).toBe("var(--primary-500)");
    expect(card).toHaveClass("bg-surface");
  });

  it("applique le fond du jeton et le ton du texte à la carte sélectionnée", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<UserTypeCardGroup legend="Tu es… ?" name="profil" options={PROFILS} onChange={onChange} />);
    await user.click(screen.getByText("Apprenant"));
    expect(onChange).toHaveBeenCalledWith("learner");
    const learner = screen.getByRole("radio", { name: "Apprenant" }).closest("label") as HTMLElement;
    expect(learner).toHaveClass("bg-(--choix-couleur)", "text-white");
    await user.keyboard("{ArrowDown}");
    const parent = screen.getByRole("radio", { name: "Parent" }).closest("label") as HTMLElement;
    expect(parent).toHaveClass("text-ink-900");
    expect(parent).not.toHaveClass("text-white");
    expect(learner).toHaveClass("bg-surface");
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(
      <UserTypeCardGroup legend="Tu es… ?" legendHidden name="profil" options={PROFILS} defaultValue="parent" />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
