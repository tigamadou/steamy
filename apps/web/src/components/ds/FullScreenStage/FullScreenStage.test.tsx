import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { FullScreenStage, type FullScreenStageTone } from "./FullScreenStage";

const TONES: FullScreenStageTone[] = ["primary", "light", "error"];

describe("FullScreenStage", () => {
  it("rend le contenu dans main#contenu, ton clair par défaut", () => {
    render(
      <FullScreenStage>
        <h1>On attend l&apos;accord</h1>
      </FullScreenStage>,
    );
    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("id", "contenu");
    expect(main).toHaveAttribute("data-tone", "light");
    expect(main).toHaveClass("bg-bg");
    expect(screen.getByRole("heading", { name: "On attend l'accord" })).toBeInTheDocument();
  });

  it.each(TONES)("applique le ton %s", (tone) => {
    render(
      <FullScreenStage tone={tone} className="extra">
        <p>Contenu</p>
      </FullScreenStage>,
    );
    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("data-tone", tone);
    expect(main).toHaveClass("extra");
  });

  it("utilise le dégradé primaire et le texte blanc en ton primary", () => {
    render(
      <FullScreenStage tone="primary">
        <p>Steamy</p>
      </FullScreenStage>,
    );
    expect(screen.getByRole("main")).toHaveClass("from-primary-500", "to-primary-700", "text-white");
  });

  it("affiche la barre du haut seulement si elle est fournie", () => {
    const { rerender } = render(
      <FullScreenStage>
        <p>Contenu</p>
      </FullScreenStage>,
    );
    expect(screen.getByRole("main").children).toHaveLength(1);
    rerender(
      <FullScreenStage topbar={<a href="/aide">Nous contacter</a>}>
        <p>Contenu</p>
      </FullScreenStage>,
    );
    expect(screen.getByRole("main").children).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Nous contacter" })).toBeInTheDocument();
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(
      <FullScreenStage topbar={<a href="/aide">Aide</a>}>
        <h1>Titre</h1>
      </FullScreenStage>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
