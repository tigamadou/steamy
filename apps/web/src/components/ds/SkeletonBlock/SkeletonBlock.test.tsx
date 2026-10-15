import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { SkeletonBlock } from "./SkeletonBlock";

describe("SkeletonBlock", () => {
  it("est décoratif et accepte ses dimensions", () => {
    const { container } = render(<SkeletonBlock className="h-40 rounded-xl" />);
    const block = container.firstElementChild;
    expect(block).toHaveAttribute("aria-hidden", "true");
    expect(block).toHaveClass("h-40", "rounded-xl");
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(
      <div aria-busy="true">
        <p className="sr-only">Chargement des parcours</p>
        <SkeletonBlock />
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
