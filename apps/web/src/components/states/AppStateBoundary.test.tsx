import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AppStateBoundary, AppStateFallback } from "./AppStateBoundary";

describe("AppStateBoundary", () => {
  it("affiche ses enfants tant qu'aucune erreur ne survient", () => {
    render(
      <AppStateBoundary>
        <p>Grille des parcours</p>
      </AppStateBoundary>,
    );
    expect(screen.getByText("Grille des parcours")).toBeInTheDocument();
  });

  it("remplace la section en erreur par un WX02 réduit, sans bouton « Retour »", async () => {
    const retry = vi.fn();
    render(AppStateFallback({ register: "vous" }, { retry }));
    expect(screen.getByRole("heading", { level: 2, name: "Oups, ça a coupé" })).toBeInTheDocument();
    expect(screen.getByText(/Réessayez dans un instant/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retour" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
