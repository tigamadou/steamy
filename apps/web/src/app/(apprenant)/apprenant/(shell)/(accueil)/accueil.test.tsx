import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/dashboard/Dashboard", () => ({ Dashboard: () => null }));

const { default: Home } = await import("./page");
const { default: Loading } = await import("./loading");
const { Dashboard } = await import("@/features/dashboard/Dashboard");

describe("accueil de l'apprenant", () => {
  it("rend le tableau de bord (WD01 / WD02)", () => {
    expect((Home() as ReactElement).type).toBe(Dashboard);
  });

  it("WD03 : squelette annoncé, sans titre concurrent du header", () => {
    render(<Loading />);
    expect(screen.getByRole("status", { name: "Chargement de ton tableau de bord…" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(screen.queryByRole("heading")).toBeNull();
  });
});
