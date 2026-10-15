import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const steps = vi.fn();
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ POST: vi.fn() }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("../SignupGate", () => ({
  SignupGate: ({ steps: allowed, children }: { steps: string[]; children: (state: object) => React.ReactNode }) => {
    steps(allowed);
    return children({ step: "password" });
  },
}));

const { default: LearnerPasswordPage, metadata } = await import("./page");

describe("LearnerPasswordPage (W10)", () => {
  it("affiche le formulaire sous la garde de l'étape « password »", async () => {
    const { container } = render(<LearnerPasswordPage />);
    expect(metadata.title).toBe("Crée ton mot de passe");
    expect(steps).toHaveBeenCalledWith(["password"]);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Crée ton mot de passe");
    expect(screen.getByText("Inscription · étape 4/4")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Valider mon mot de passe" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
