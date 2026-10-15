import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

import { Input } from "./Input";

describe("Input", () => {
  it("transmet la saisie et les attributs natifs", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Input aria-label="Ville" name="ville" onChange={onChange} placeholder="Cotonou" />);
    const input = screen.getByRole("textbox", { name: "Ville" });
    expect(input).toHaveAttribute("name", "ville");
    await user.type(input, "Porto");
    expect(input).toHaveValue("Porto");
    expect(onChange).toHaveBeenCalledTimes(5);
  });

  it("se marque invalide hors Field", () => {
    render(<Input aria-label="Code" invalid />);
    expect(screen.getByRole("textbox", { name: "Code" })).toHaveAttribute("aria-invalid", "true");
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(<Input aria-label="Recherche" type="search" icon="search" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
