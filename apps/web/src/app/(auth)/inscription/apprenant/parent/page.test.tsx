import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const steps = vi.fn();
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ POST: vi.fn() }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock("@/lib/use-referential", () => ({ useReferential: () => ({ items: [], status: "ready" }) }));
vi.mock("../SignupGate", () => ({
  SignupGate: ({ steps: allowed, children }: { steps: string[]; children: (state: object) => React.ReactNode }) => {
    steps(allowed);
    return children({ step: "parent" });
  },
}));

const { default: ParentPhonePage, metadata } = await import("./page");

describe("ParentPhonePage (W06)", () => {
  it("affiche le formulaire sous la garde de l'étape « parent »", async () => {
    const { container } = render(<ParentPhonePage />);
    expect(metadata.title).toBe("Numéro d'un parent");
    expect(steps).toHaveBeenCalledWith(["parent"]);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Numéro d'un parent");
    expect(screen.getByRole("button", { name: "Envoyer la demande au parent" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
