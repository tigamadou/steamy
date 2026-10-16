import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Medal } from "./Medal";

describe("Medal", () => {
  it("image nommée par le badge, taille réglable", () => {
    render(<Medal icon="🏆" label="Projet validé" kind="project" size={100} />);
    const medal = screen.getByRole("img", { name: "Projet validé" });
    expect(medal).toHaveStyle({ width: "100px" });
  });

  it("niveau par défaut", () => {
    render(<Medal icon="⚙️" label="Niveau" />);
    expect(screen.getByRole("img", { name: "Niveau" })).toHaveStyle({ width: "160px" });
  });
});
