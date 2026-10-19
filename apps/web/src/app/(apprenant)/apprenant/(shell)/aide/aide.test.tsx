import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { LEARNER_FAQ } from "@/content/faq/apprenant";
import { axe } from "@/test/axe";

import LearnerHelpPage, { metadata } from "./page";

describe("WD12 · aide de l'apprenant", () => {
  it("FAQ statique sous le h1 du shell, lien vers le support (WL24)", async () => {
    const { container } = render(<LearnerHelpPage />);
    expect(metadata.title).toBe("Aide & Support");
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(screen.getByRole("heading", { level: 2, name: "Questions fréquentes" })).toBeInTheDocument();
    expect(screen.getByText("J'ai oublié mon mot de passe")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Contacter le support" })).toHaveAttribute("href", "/aide#contact");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("recherche locale dans les questions et les réponses", async () => {
    render(<LearnerHelpPage />);
    await userEvent.type(screen.getByRole("searchbox", { name: "Rechercher une question" }), "kit code");
    expect(screen.getByText("Où trouver mon Kit Code ?")).toBeInTheDocument();
    expect(screen.queryByText("J'ai oublié mon mot de passe")).toBeNull();
    await userEvent.clear(screen.getByRole("searchbox"));
    await userEvent.type(screen.getByRole("searchbox"), "introuvable");
    expect(screen.getByText(/Aucune question ne correspond/)).toBeInTheDocument();
  });

  it("au tutoiement, sans changement de parent depuis l'application (D26)", () => {
    const text = JSON.stringify(LEARNER_FAQ);
    expect(text).not.toMatch(/\b(vous|votre|vos)\b/i);
    expect(text).not.toMatch(/changer de parent|changement de parent/i);
    expect(text).toMatch(/demande à ton parent/);
  });
});
