import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ POST: vi.fn() }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

const { default: ParentCodePage, metadata } = await import("./page");

describe("ParentCodePage (WP02)", () => {
  it("affiche la vérification du numéro", async () => {
    sessionStorage.setItem(
      "steamy:parentChallenge",
      JSON.stringify({ challengeId: "ch-1", destinationMasked: "+229 01 •• •• •• 56", expiresInSec: 600, resendInSec: 0 }),
    );
    const { container } = render(<ParentCodePage />);
    expect(metadata.title).toBe("Vérifiez votre numéro");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Vérifiez votre numéro");
    expect(screen.getByRole("button", { name: "Vérifier le code" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
    sessionStorage.clear();
  });
});
