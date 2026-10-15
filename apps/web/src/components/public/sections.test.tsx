import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { WLJoinBanner, WLPillarCard, WLSectionHead, WLStep } from "./sections";
import { WLSocial } from "./WLSocial";

describe("sections publiques", () => {
  it("WLSectionHead : sur-titre et titre de section", () => {
    render(<WLSectionHead kicker="Comment ça marche" title="3 étapes" />);
    expect(screen.getByText("Comment ça marche")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "3 étapes" })).toBeInTheDocument();
  });

  it("WLPillarCard : pastille colorée par un token", () => {
    const { container } = render(
      <WLPillarCard emoji="🤖" title="Parcours guidés" description="Projet par projet." color="var(--cat-robotique)" />,
    );
    expect(screen.getByRole("heading", { level: 3, name: "Parcours guidés" })).toBeInTheDocument();
    expect(container.querySelector<HTMLElement>("[aria-hidden]")!.style.getPropertyValue("--pillar")).toBe(
      "var(--cat-robotique)",
    );
  });

  it("WLStep : le numéro est annoncé avec le titre", () => {
    render(<WLStep n={2} title="Explore le catalogue" description="Choisis ton parcours." />);
    expect(screen.getByRole("heading", { name: /^Étape 2 :\s*Explore le catalogue$/ })).toBeInTheDocument();
  });

  it("WLJoinBanner : rappel du parent et lien vers l'inscription", () => {
    render(<WLJoinBanner />);
    expect(screen.getByText(/rattaché à un parent qui valide en 1 min/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Créer un compte" })).toHaveAttribute("href", "/inscription");
  });

  it("WLSocial : icônes sombres sur fond clair et liens de partage", () => {
    render(<WLSocial light links={[{ network: "x", label: "Partager sur X", href: "https://x.com/intent/post" }]} />);
    const link = screen.getByRole("link", { name: "Partager sur X (nouvel onglet)" });
    expect(link).toHaveAttribute("href", "https://x.com/intent/post");
    expect(link).toHaveClass("text-ink-600");
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(
      <>
        <WLSectionHead kicker="Kicker" title="Titre" />
        <WLPillarCard emoji="📦" title="Kits" description="Construis." color="var(--cat-ia)" />
        <WLStep n={1} title="Crée ton compte" description="En 1 min." />
        <WLJoinBanner />
      </>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
