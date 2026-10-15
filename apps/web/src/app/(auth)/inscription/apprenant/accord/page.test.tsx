import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const steps = vi.fn();
vi.mock("../SignupGate", () => ({
  SignupGate: ({ steps: allowed, children }: { steps: string[]; children: (state: object) => React.ReactNode }) => {
    steps(allowed);
    return children({ step: "password", firstName: "Awa", consentRequest: null });
  },
}));

const { default: ConsentGrantedPage, metadata } = await import("./page");

describe("ConsentGrantedPage (W08)", () => {
  it("annonce l'accord du parent, oublie le code de reprise et mène au mot de passe", async () => {
    sessionStorage.setItem("steamy:resumeCode", "ABCDEFGH");
    const { container } = render(<ConsentGrantedPage />);
    expect(metadata.title).toBe("Inscription validée");
    expect(steps).toHaveBeenCalledWith(["password"]);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Super, c'est validé !");
    expect(screen.getByText(/Bravo Awa : ton parent a accepté ton inscription\./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Continuer" })).toHaveAttribute(
      "href",
      "/inscription/apprenant/mot-de-passe",
    );
    expect(sessionStorage.getItem("steamy:resumeCode")).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });
});
