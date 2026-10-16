import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { StatPill } from "./StatPill";

describe("StatPill", () => {
  it("associe le libellé et la valeur lue dans l'API", async () => {
    const { container } = render(<StatPill icon="flame" label="Streak" value="5 jours" tone="amber" />);
    expect(screen.getByRole("term")).toHaveTextContent("Streak");
    expect(screen.getByRole("definition")).toHaveTextContent("5 jours");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("prend le ton primaire par défaut", () => {
    const { container } = render(<StatPill icon="sparkle" label="Points" value={1240} />);
    expect(container.querySelector(".bg-primary-100")).not.toBeNull();
  });
});
