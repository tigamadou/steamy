import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { DeadlineTracker, type DeadlineStep } from "./DeadlineTracker";

const STEPS: DeadlineStep[] = [
  { label: "Collecte", date: "31 janv.", state: "done" },
  { label: "Saisie", date: "10 févr.", state: "current" },
  { label: "Soumission", date: "15 févr.", state: "todo" },
];

describe("DeadlineTracker", () => {
  it("liste les étapes dans l'ordre, la courante signalée", () => {
    render(<DeadlineTracker steps={STEPS} label="Échéances du rapport" />);
    const items = within(screen.getByRole("list", { name: "Échéances du rapport" })).getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual([
      "Collecte31 janv., terminée",
      "2Saisie10 févr., en cours",
      "3Soumission15 févr., à venir",
    ]);
    expect(items[1]).toHaveAttribute("aria-current", "step");
    expect(items[0]).not.toHaveAttribute("aria-current");
  });

  it("affiche l'état vide", () => {
    render(<DeadlineTracker steps={[]} label="Échéances" />);
    expect(screen.getByText("Aucune échéance.")).toBeInTheDocument();
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(<DeadlineTracker steps={STEPS} label="Échéances" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
