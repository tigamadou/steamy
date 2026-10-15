import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const logout = vi.fn();
const router = { replace: vi.fn(), refresh: vi.fn() };
vi.mock("@/lib/auth/logout", () => ({ logout }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const { LogoutButton } = await import("./LogoutButton");

describe("LogoutButton", () => {
  beforeEach(() => {
    logout.mockReset();
    router.replace.mockReset();
    router.refresh.mockReset();
  });

  it("déconnecte puis remplace l'historique par la connexion", async () => {
    logout.mockResolvedValue(undefined);
    render(<LogoutButton />);
    await userEvent.click(screen.getByRole("button", { name: "Se déconnecter" }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/connexion"));
    expect(router.refresh).toHaveBeenCalled();
  });

  it("signale l'échec au registre demandé et reste sur la page", async () => {
    logout.mockRejectedValue(new Error("réseau"));
    render(<LogoutButton errorMessage="La déconnexion a échoué. Réessayez." />);
    await userEvent.click(screen.getByRole("button", { name: "Se déconnecter" }));
    expect(await screen.findByText("La déconnexion a échoué. Réessayez.")).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(<LogoutButton />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
