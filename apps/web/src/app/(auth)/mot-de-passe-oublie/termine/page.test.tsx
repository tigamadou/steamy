import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import ResetDonePage, { metadata } from "./page";

describe("Page WL05", () => {
  it("confirme la réinitialisation, renvoie vers la connexion et reste accessible", async () => {
    expect(metadata.title).toBe("Mot de passe réinitialisé");
    const { container } = render(<ResetDonePage />);
    expect(screen.getByRole("heading", { name: "Mot de passe réinitialisé !" })).toBeInTheDocument();
    expect(screen.getByText(/Les sessions ouvertes sur vos autres appareils ont été fermées\./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Se connecter" })).toHaveAttribute("href", "/connexion");
    expect(await axe(container)).toHaveNoViolations();
  });
});
