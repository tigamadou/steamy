import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

import { Tag } from "./Tag";

describe("Tag", () => {
  it("est un vrai bouton à bascule", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { rerender } = render(<Tag onClick={onClick}>Robotique</Tag>);
    const button = screen.getByRole("button", { name: "Robotique" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    await user.tab();
    await user.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledOnce();
    rerender(
      <Tag active onClick={onClick}>
        Robotique
      </Tag>,
    );
    expect(button).toHaveAttribute("aria-pressed", "true");
  });

  it("peut être un lien filtrant", () => {
    render(
      <Tag href="/parcours?categorie=ia" active color="var(--cat-ia)">
        IA
      </Tag>,
    );
    const link = screen.getByRole("link", { name: "IA" });
    expect(link).toHaveAttribute("href", "/parcours?categorie=ia");
    expect(link).toHaveAttribute("aria-current", "true");
  });

  it("n'anime que la bordure : texte et fond ne passent par aucun état intermédiaire au changement d'état", () => {
    render(<Tag href="/parcours">Toutes</Tag>);
    const link = screen.getByRole("link", { name: "Toutes" });
    expect(link).toHaveClass("transition-[border-color]");
    expect(link).not.toHaveClass("transition-colors");
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(
      <div>
        <Tag active>Tous</Tag>
        <Tag color="var(--cat-code)">Code</Tag>
        <Tag href="/parcours?categorie=energie">Énergie</Tag>
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
