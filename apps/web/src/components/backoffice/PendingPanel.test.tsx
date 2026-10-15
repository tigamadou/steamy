import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { PendingPanel } from "./PendingPanel";

describe("PendingPanel", () => {
  it("annonce une page dont les données arrivent, sans chiffre fictif", async () => {
    const { container } = render(<PendingPanel kicker="Bonjour" title="Synthèse en préparation" text="Bientôt ici." />);
    expect(screen.getByRole("heading", { level: 2, name: "Synthèse en préparation" })).toBeInTheDocument();
    expect(screen.getByText("Bientôt ici.")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
