import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { Avatar, initials } from "./Avatar";

describe("Avatar", () => {
  it("calcule les initiales", () => {
    expect(initials("Awa Koné")).toBe("AK");
    expect(initials("kofi")).toBe("KO");
    expect(initials("  Jean Paul Dossou ")).toBe("JD");
  });

  it("affiche les initiales avec le nom pour libellé", () => {
    render(<Avatar name="Awa Koné" />);
    expect(screen.getByRole("img", { name: "Awa Koné" })).toHaveTextContent("AK");
  });

  it("affiche un emoji plutôt qu'une photo", () => {
    const { container } = render(<Avatar name="Kofi" emoji="🦊" status ring />);
    expect(screen.getByRole("img", { name: "Kofi" })).toHaveTextContent("🦊");
    expect(container.querySelector("img")).toBeNull();
  });

  it("peut être décoratif", () => {
    render(<Avatar name="Kofi" decorative />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("accepte une couleur imposée et un nom vide", () => {
    expect(initials("")).toBe("");
    const { container } = render(<Avatar name="" decorative />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    render(<Avatar name="Kofi" color="var(--cat-code)" />);
    expect(screen.getByRole("img", { name: "Kofi" }).style.getPropertyValue("--avatar-bg")).toBe("var(--cat-code)");
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(
      <div>
        <Avatar name="Awa Koné" size={32} />
        <Avatar name="Kofi" emoji="🦊" />
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
