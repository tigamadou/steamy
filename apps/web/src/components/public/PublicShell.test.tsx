import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { site } from "@/content/site";
import { axe } from "@/test/axe";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

const { PublicShell } = await import("./PublicShell");

describe("PublicShell", () => {
  it("enchaîne lien d'évitement, navigation, contenu principal et pied de page", () => {
    render(
      <PublicShell>
        <h1>Page</h1>
      </PublicShell>,
    );
    expect(screen.getByRole("link", { name: "Aller au contenu" })).toHaveAttribute("href", "#contenu");
    expect(screen.getByRole("main")).toHaveAttribute("id", "contenu");
    expect(within(screen.getByRole("main")).getByRole("heading", { name: "Page" })).toBeInTheDocument();
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("donne au pied de page les colonnes et cibles de D17", () => {
    render(<PublicShell>contenu</PublicShell>);
    const footer = within(screen.getByRole("contentinfo"));
    const targets = Object.fromEntries(footer.getAllByRole("link").map((l) => [l.textContent, l.getAttribute("href")]));
    expect(targets).toMatchObject({
      Parcours: "/parcours",
      "Boutique de kits": "/boutique",
      "Steamy Events": "/evenements",
      Tarifs: "/ecoles",
      "Centre d'aide": "/aide#faq",
      "Nous contacter": "/aide#contact",
      "Consentement parent": "/legal/cgu#consentement-parental",
      CGU: "/legal/cgu",
      "Mentions légales": "/legal/mentions-legales",
      Confidentialité: "/legal/confidentialite",
    });
    expect(footer.getByText(site.copyright)).toBeInTheDocument();
    expect(footer.getByRole("img", { name: "Steamy" })).toHaveAttribute("src", expect.stringContaining("white"));
  });

  it("ouvre les réseaux sociaux dans un nouvel onglet, sans transmettre l'origine", () => {
    render(<PublicShell>contenu</PublicShell>);
    const instagram = screen.getByRole("link", { name: "Instagram (nouvel onglet)" });
    expect(instagram).toHaveAttribute("target", "_blank");
    expect(instagram).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(
      <PublicShell>
        <h1>Page</h1>
      </PublicShell>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
