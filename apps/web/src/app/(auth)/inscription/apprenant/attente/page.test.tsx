import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const steps = vi.fn();
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ GET: vi.fn(), POST: vi.fn() }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock("../SignupGate", () => ({
  SignupGate: ({ steps: allowed, children }: { steps: string[]; children: (state: object) => React.ReactNode }) => {
    steps(allowed);
    return children({
      step: "waiting",
      firstName: "Awa",
      username: "awa.k",
      expiresAt: "2026-10-22T08:00:00Z",
      consentRequest: {
        id: 42,
        status: "pending",
        parentPhoneMasked: "+229 01 •• •• 56",
        relationship: "mother",
        expiresAt: "2026-10-17T08:00:00Z",
        resendInSec: 60,
        refusalReason: null,
      },
    });
  },
}));

const { default: WaitingPage, metadata } = await import("./page");

describe("WaitingPage (W07)", () => {
  it("affiche l'attente sous la garde de l'étape « waiting »", async () => {
    const { container } = render(<WaitingPage />);
    expect(metadata.title).toBe("En attente de ton parent");
    expect(steps).toHaveBeenCalledWith(["waiting"]);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("On attend l'accord de ton parent…");
    expect(screen.getByText("+229 01 •• •• 56")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
