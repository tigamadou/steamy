import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { Logo } from "./Logo";

describe("Logo", () => {
  it("affiche le logo coloré avec un texte alternatif", () => {
    render(<Logo />);
    const img = screen.getByRole("img", { name: "Steamy" });
    expect(img.getAttribute("src")).toContain("steamy_logo.png");
    expect(img).toHaveAttribute("height", "40");
  });

  it("charge l'asset blanc sur fond foncé, sans filtre CSS", () => {
    render(<Logo variant="white" height={32} />);
    const img = screen.getByRole("img", { name: "Steamy" });
    expect(img.getAttribute("src")).toContain("logo_landscape_white_tight.png");
    expect(img.getAttribute("style") ?? "").not.toContain("filter");
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(<Logo />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
