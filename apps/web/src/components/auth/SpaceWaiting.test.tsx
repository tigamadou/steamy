import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const getCurrentUser = vi.fn();
vi.mock("@/lib/auth/session", () => ({ getCurrentUser }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));

const { SpaceWaiting } = await import("./SpaceWaiting");

describe("SpaceWaiting", () => {
  it("tutoie l'apprenant et propose la déconnexion", async () => {
    getCurrentUser.mockResolvedValue({ firstName: "Léa" });
    const { container } = render(await SpaceWaiting({ role: "learner" }));
    expect(screen.getByRole("heading", { level: 1, name: "Salut Léa !" })).toBeInTheDocument();
    expect(screen.getByText(/Ton espace Steamy arrive/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Se déconnecter" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it.each([
    ["parent", "Votre espace parent arrive très bientôt."],
    ["teacher", "Votre espace enseignant arrive très bientôt."],
  ] as const)("vouvoie le rôle %s", async (role, text) => {
    getCurrentUser.mockResolvedValue({ firstName: "Marie" });
    render(await SpaceWaiting({ role }));
    expect(screen.getByRole("heading", { name: "Bonjour Marie" })).toBeInTheDocument();
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it("reste lisible si la session disparaît pendant le rendu", async () => {
    getCurrentUser.mockResolvedValue(null);
    render(await SpaceWaiting({ role: "parent" }));
    expect(screen.getByRole("heading", { name: "Bonjour" })).toBeInTheDocument();
  });
});
