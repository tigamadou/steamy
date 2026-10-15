import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const steps = vi.fn();
let state: object = {};
vi.mock("../SignupGate", () => ({
  SignupGate: ({ steps: allowed, children }: { steps: string[]; children: (state: object) => React.ReactNode }) => {
    steps(allowed);
    return children(state);
  },
}));

const { default: ConsentRefusedPage, metadata } = await import("./page");

const REQUEST = {
  id: 42,
  status: "refused",
  parentPhoneMasked: "+229 01 •• •• 56",
  relationship: "mother",
  expiresAt: "2026-10-17T08:00:00Z",
  resendInSec: 0,
  refusalReason: { id: 1, code: "too-young", label: "Trop jeune pour l'instant" },
};

describe("ConsentRefusedPage (W18)", () => {
  beforeEach(() => {
    state = { step: "refused", firstName: "Awa", consentRequest: REQUEST };
  });

  it("annonce le refus avec son motif, oublie le code de reprise et n'offre aucune nouvelle tentative", async () => {
    sessionStorage.setItem("steamy:resumeCode", "ABCDEFGH");
    const { container } = render(<ConsentRefusedPage />);
    expect(metadata.title).toBe("Inscription non validée");
    expect(steps).toHaveBeenCalledWith(["refused"]);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Inscription non validée");
    expect(screen.getByText("Motif indiqué : « Trop jeune pour l'instant »")).toBeInTheDocument();
    expect(screen.getByText(/refaire une demande à ce parent dans 30 jours/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retour à l'accueil" })).toHaveAttribute("href", "/inscription");
    expect(screen.getByRole("link", { name: "Besoin d'aide ?" })).toHaveAttribute(
      "href",
      "/aide?sujet=changement-parent#contact",
    );
    expect(screen.queryByRole("link", { name: /Changer de parent/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Changer de parent/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Réessayer plus tard/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Réessayer plus tard/ })).not.toBeInTheDocument();
    expect(sessionStorage.getItem("steamy:resumeCode")).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("n'affiche pas de motif sans demande", () => {
    state = { step: "refused", firstName: "Awa", consentRequest: null };
    render(<ConsentRefusedPage />);
    expect(screen.queryByText(/Motif indiqué/)).not.toBeInTheDocument();
    expect(screen.getByText("Ton parent n'a pas accepté ton inscription.")).toBeInTheDocument();
  });

  it("n'affiche pas de motif quand le parent n'en a pas donné", () => {
    state = { step: "refused", firstName: "Awa", consentRequest: { ...REQUEST, refusalReason: null } };
    render(<ConsentRefusedPage />);
    expect(screen.queryByText(/Motif indiqué/)).not.toBeInTheDocument();
  });
});
