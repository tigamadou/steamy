import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { Badge, type BadgeTone } from "./Badge";

const TONES: BadgeTone[] = ["neutral", "primary", "success", "amber", "error", "info"];

describe("Badge", () => {
  it.each(TONES)("rend le ton %s", (tone) => {
    render(<Badge tone={tone}>Débutant</Badge>);
    expect(screen.getByText("Débutant")).toBeInTheDocument();
  });

  it("rend la variante pleine avec une icône décorative", () => {
    const { container } = render(
      <Badge solid icon="star">
        Nouveau
      </Badge>,
    );
    expect(screen.getByText("Nouveau")).toHaveClass("bg-primary-500");
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(
      <p>
        {TONES.map((tone) => (
          <Badge key={tone} tone={tone}>
            {tone}
          </Badge>
        ))}
      </p>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
