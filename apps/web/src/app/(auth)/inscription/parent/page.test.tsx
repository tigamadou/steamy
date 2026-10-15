import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ POST: vi.fn() }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/use-referential", () => ({ useReferential: () => ({ items: [], status: "ready" }) }));
vi.mock("@/components/auth/SignedInRedirect", () => ({ SignedInRedirect: () => <p>redirection</p> }));

const { default: ParentSignupPage, metadata } = await import("./page");

describe("ParentSignupPage (WP01)", () => {
  it("affiche le formulaire au vouvoiement après la garde de session", async () => {
    const { container } = render(<ParentSignupPage />);
    expect(metadata.title).toBe("Créer un compte parent");
    expect(screen.getByText("redirection")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Créez votre compte parent");
    expect(screen.getByRole("button", { name: "Recevoir mon code par SMS" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
