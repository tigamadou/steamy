import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ GET: vi.fn() }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

const { default: LearnerSignupLayout } = await import("../layout");
const { default: IdentityPage, metadata } = await import("./page");

describe("IdentityPage (W04)", () => {
  it("affiche l'étape 1/4 avec le formulaire vide", async () => {
    const { container } = render(
      LearnerSignupLayout({ children: <IdentityPage /> } as LayoutProps<"/inscription/apprenant">),
    );
    expect(metadata.title).toBe("Crée ton compte");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Crée ton compte");
    expect(screen.getByText("Inscription · étape 1/4")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Identifiant/ })).toHaveValue("");
    expect(await axe(container)).toHaveNoViolations();
  });
});
