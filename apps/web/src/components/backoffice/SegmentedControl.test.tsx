import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

import { SegmentedControl } from "./SegmentedControl";

const PERIODS = [{ id: "mois", label: "Mois" }, { id: "trimestre", label: "Trimestre" }, "Année"];

describe("SegmentedControl", () => {
  it("indique l'option active et signale le choix", async () => {
    const onChange = vi.fn();
    render(<SegmentedControl label="Période" options={PERIODS} value="mois" onChange={onChange} />);
    expect(screen.getByRole("group", { name: "Période" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mois" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Année" })).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(screen.getByRole("button", { name: "Trimestre" }));
    expect(onChange).toHaveBeenCalledWith("trimestre");
    await userEvent.click(screen.getByRole("button", { name: "Année" }));
    expect(onChange).toHaveBeenLastCalledWith("Année");
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(
      <SegmentedControl label="Période" options={PERIODS} value="mois" onChange={() => {}} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
