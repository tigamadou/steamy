import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProgressBar } from "./ProgressBar";

describe("ProgressBar", () => {
  it("annonce la valeur arrondie de l'API", () => {
    render(<ProgressBar value={62.4} label="Progression du parcours" />);
    const bar = screen.getByRole("progressbar", { name: "Progression du parcours" });
    expect(bar).toHaveAttribute("aria-valuenow", "62");
  });

  it("borne l'affichage entre 0 et 100 et peut montrer son libellé", () => {
    const { rerender } = render(<ProgressBar value={140} label="Projet" showLabel tone="success" size="lg" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
    expect(screen.getByText("100 %")).toBeInTheDocument();
    rerender(<ProgressBar value={-3} label="Projet" inverse tone="amber" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  });
});
