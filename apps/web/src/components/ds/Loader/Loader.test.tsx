import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { Loader } from "./Loader";

describe("Loader", () => {
  it.each(["dots", "spin"] as const)("affiche toujours son message (%s)", (kind) => {
    render(<Loader kind={kind} label="On prépare ton parcours…" />);
    expect(screen.getByRole("status")).toHaveTextContent("On prépare ton parcours…");
  });

  it("empile l'animation au-dessus d'un message mis en avant", () => {
    render(<Loader stacked label="On prépare ton contenu…" />);
    expect(screen.getByRole("status")).toHaveClass("flex-col");
  });

  it("a une variante monochrome, points et anneau en encre", () => {
    const { container, rerender } = render(<Loader tone="ink" label="Ouverture du back-office…" />);
    expect(container.innerHTML).not.toMatch(/primary|success|amber/);
    rerender(<Loader tone="ink" kind="spin" label="Chargement" />);
    expect(container.innerHTML).not.toMatch(/primary/);
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(<Loader label="Chargement…" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
