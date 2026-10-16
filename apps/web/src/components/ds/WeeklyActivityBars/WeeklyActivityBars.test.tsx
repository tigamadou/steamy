import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WeeklyActivityBars } from "./WeeklyActivityBars";

describe("WeeklyActivityBars", () => {
  it("barres décoratives et tableau accessible, hauteur relative au jour le plus actif", () => {
    const { container } = render(
      <WeeklyActivityBars
        caption="Temps des 7 derniers jours"
        days={[
          { label: "lun.", fullLabel: "lundi 12 octobre", seconds: 0, value: "0 min" },
          { label: "mar.", fullLabel: "mardi 13 octobre", seconds: 1200, value: "20 min" },
        ]}
      />,
    );
    expect(screen.getByRole("table", { name: "Temps des 7 derniers jours" })).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: "mardi 13 octobre" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "20 min" })).toBeInTheDocument();
    const bars = container.querySelectorAll<HTMLElement>("[aria-hidden] .rounded-t-md");
    expect(bars[0].style.height).toBe("4%");
    expect(bars[1].style.height).toBe("100%");
  });

  it("semaine vide : barres minimales", () => {
    const { container } = render(
      <WeeklyActivityBars caption="Vide" days={[{ label: "lun.", fullLabel: "lundi", seconds: 0, value: "0 min" }]} />,
    );
    expect(container.querySelector<HTMLElement>(".rounded-t-md")?.style.height).toBe("4%");
  });
});
