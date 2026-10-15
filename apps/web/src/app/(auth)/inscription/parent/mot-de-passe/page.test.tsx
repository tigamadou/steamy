import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ POST: vi.fn() }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));

const { default: ParentPasswordPage, metadata } = await import("./page");

describe("ParentPasswordPage (WP03)", () => {
  it("affiche le formulaire de mot de passe", async () => {
    sessionStorage.setItem(
      "steamy:parentChallenge",
      JSON.stringify({ challengeId: "ch-1", destinationMasked: "+229 01 •• •• •• 56", expiresInSec: 600, resendInSec: 0 }),
    );
    const { container } = render(<ParentPasswordPage />);
    expect(metadata.title).toBe("Créez votre mot de passe");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Créez votre mot de passe");
    expect(screen.getByRole("button", { name: "Valider mon mot de passe" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
    sessionStorage.clear();
  });
});
