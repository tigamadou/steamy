import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { Loader } from "./Loader";

describe("Loader", () => {
  it.each(["dots", "spin"] as const)("affiche toujours son message (%s)", (kind) => {
    render(<Loader kind={kind} label="On prépare ton parcours…" />);
    expect(screen.getByRole("status")).toHaveTextContent("On prépare ton parcours…");
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(<Loader label="Chargement…" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
