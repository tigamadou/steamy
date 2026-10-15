import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { ProgressSteps } from "./ProgressSteps";

describe("ProgressSteps", () => {
  it("expose une barre de progression accessible", () => {
    render(<ProgressSteps step={2} total={4} />);
    const bar = screen.getByRole("progressbar", { name: "Progression" });
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "4");
    expect(bar).toHaveAttribute("aria-valuenow", "2");
    expect(bar).toHaveAttribute("aria-valuetext", "Étape 2 sur 4");
  });

  it("remplit autant de segments que d'étapes franchies", () => {
    const { container } = render(<ProgressSteps step={3} total={4} />);
    const segments = container.querySelectorAll("[role=progressbar] > span");
    expect(segments).toHaveLength(4);
    expect(container.querySelectorAll("[data-done]")).toHaveLength(3);
    expect(segments[3]).toHaveClass("bg-ink-100");
    expect(segments[0]).toHaveClass("bg-primary-500");
  });

  it("annonce le libellé fourni", () => {
    render(<ProgressSteps step={2} total={4} label="Profil 2/4" className="max-w-70" />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuetext", "Profil 2/4");
    expect(bar).toHaveClass("max-w-70");
  });

  it("borne l'étape entre 0 et le total", () => {
    const { rerender } = render(<ProgressSteps step={9} total={4} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "4");
    rerender(<ProgressSteps step={-1} total={4} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
    rerender(<ProgressSteps step={1} total={-2} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuemax", "0");
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(<ProgressSteps step={1} total={4} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
