import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => "/backoffice/impact" }));

const { PeriodSwitch } = await import("./PeriodSwitch");

describe("PeriodSwitch", () => {
  it("met la période dans l'URL pour que le serveur recharge les valeurs", async () => {
    render(<PeriodSwitch value="mois" />);
    expect(screen.getByRole("button", { name: "Mois" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: "Trimestre" }));
    expect(push).toHaveBeenLastCalledWith("/backoffice/impact?periode=trimestre");
    await userEvent.click(screen.getByRole("button", { name: "Mois" }));
    expect(push).toHaveBeenLastCalledWith("/backoffice/impact");
  });
});
