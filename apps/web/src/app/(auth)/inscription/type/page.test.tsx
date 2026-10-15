import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/auth/SignedInRedirect", () => ({ SignedInRedirect: () => <p>redirection</p> }));

const { default: UserTypePage, metadata } = await import("./page");

describe("UserTypePage (W03)", () => {
  it("affiche le choix du profil après la garde de session", async () => {
    const { container } = render(<UserTypePage />);
    expect(metadata.title).toMatch(/^Créer un compte/);
    expect(screen.getByText("redirection")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Tu es… ?");
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect(await axe(container)).toHaveNoViolations();
  });
});
