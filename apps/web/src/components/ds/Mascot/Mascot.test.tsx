import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { MASCOT_POSES, Mascot } from "./Mascot";

describe("Mascot", () => {
  it("propose les 6 poses", () => {
    expect(MASCOT_POSES).toEqual(["idle", "wave", "cheer", "focus", "sad", "sleep"]);
  });

  it.each(MASCOT_POSES)("dessine la pose %s, décorative", (pose) => {
    const { container } = render(<Mascot pose={pose} size={80} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("data-pose", pose);
    expect(svg).toHaveAttribute("width", "80");
  });

  it("dort les yeux fermés", () => {
    const { container } = render(<Mascot pose="sleep" />);
    expect(container.querySelector("text")).toHaveTextContent("z");
    expect(container.querySelectorAll("ellipse.fill-mascot-ink")).toHaveLength(0);
  });

  it("prend la teinte demandée", () => {
    const { container } = render(<Mascot hue="var(--cat-ia)" />);
    expect(container.querySelector("svg")?.style.getPropertyValue("--mascot-hue")).toBe("var(--cat-ia)");
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(<Mascot pose="wave" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
