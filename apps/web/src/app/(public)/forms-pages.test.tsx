import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/public/form-sections", () => ({
  QuoteSection: () => <p>formulaire de devis</p>,
  FormSkeleton: () => null,
}));
vi.mock("@/components/public/ContactForm", () => ({ ContactForm: () => <p>formulaire de contact</p> }));

const schools = await import("./ecoles/page");
const help = await import("./aide/page");

describe("WL11 · /ecoles", () => {
  it("trois offres sans fonctions hors v1, chaque CTA vers le devis avec l'offre présélectionnée", () => {
    const { container } = render(schools.default());
    expect(screen.getByRole("heading", { level: 1, name: "Amenez la robotique dans vos classes" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Choisir l'offre Classe" })).toHaveAttribute(
      "href",
      "/ecoles?offre=classe#devis",
    );
    expect(screen.getByRole("link", { name: "Choisir l'offre École" })).toHaveAttribute(
      "href",
      "/ecoles?offre=ecole#devis",
    );
    expect(screen.getByRole("link", { name: "Choisir l'offre Réseau" })).toHaveAttribute(
      "href",
      "/ecoles?offre=reseau#devis",
    );
    expect(screen.getByRole("link", { name: "Demander un devis" })).toHaveAttribute("href", "/ecoles#devis");
    expect(screen.getByText("Le plus choisi")).toBeInTheDocument();
    expect(screen.queryByText(/tableau de bord établissement|API & intégrations/i)).not.toBeInTheDocument();
    expect(
      within(container.querySelector<HTMLElement>("#devis")!).getByText("formulaire de devis"),
    ).toBeInTheDocument();
    expect(schools.metadata.title).toBe("Écoles");
  });
});

describe("WL24 · /aide", () => {
  it("FAQ par thème (#faq), formulaire (#contact) et conseils avant d'écrire", () => {
    const { container } = render(help.default());
    expect(screen.getByRole("heading", { level: 1, name: "Aide & contact" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Questions fréquentes/ })).toHaveAttribute("href", "/aide#faq");
    expect(screen.getByRole("link", { name: /Nous contacter/ })).toHaveAttribute("href", "/aide#contact");
    const faq = within(container.querySelector<HTMLElement>("#faq")!);
    expect(faq.getByRole("heading", { name: "Compte et consentement" })).toBeInTheDocument();
    expect(faq.getByRole("searchbox", { name: "Rechercher une question" })).toBeInTheDocument();
    expect(
      within(container.querySelector<HTMLElement>("#contact")!).getByText("formulaire de contact"),
    ).toBeInTheDocument();
    expect(screen.getByText(/un apprenant le fait réinitialiser par son parent/)).toBeInTheDocument();
    expect(help.metadata.title).toBe("Aide et contact");
  });
});
