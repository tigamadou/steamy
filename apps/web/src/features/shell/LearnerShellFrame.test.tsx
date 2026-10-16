import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FormHTMLAttributes } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const router = { replace: vi.fn(), refresh: vi.fn() };
const logout = vi.fn();
vi.mock("next/navigation", () => ({ usePathname: () => "/apprenant/catalogue", useRouter: () => router }));
vi.mock("next/form", () => ({ default: (props: FormHTMLAttributes<HTMLFormElement>) => <form {...props} /> }));
vi.mock("@/lib/auth/logout", () => ({ logout: () => logout() }));
vi.mock("./unread-count", () => ({ useUnreadCount: (initial: number) => initial }));

const { LearnerShellFrame } = await import("./LearnerShellFrame");

function renderFrame() {
  return render(
    <LearnerShellFrame user={{ firstName: "Léa", name: "Léa A.", subtitle: "4ᵉ · Cotonou" }} unreadCount={2}>
      <p>Page</p>
    </LearnerShellFrame>,
  );
}

describe("LearnerShellFrame", () => {
  beforeEach(() => {
    logout.mockReset();
    router.replace.mockReset();
    router.refresh.mockReset();
  });

  it("dérive l'entrée active et le titre de l'URL, et cherche dans le catalogue", () => {
    renderFrame();
    expect(screen.getByRole("heading", { level: 1, name: "Catalogue" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Catalogue" })[0]).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByRole("search")[0]).toHaveAttribute("action", "/apprenant/catalogue");
    expect(screen.getByRole("link", { name: "2 notifications non lues" })).toHaveAttribute("href", "/apprenant/notifications");
  });

  it("WD16 : confirme puis déconnecte et renvoie vers la connexion", async () => {
    const user = userEvent.setup();
    logout.mockResolvedValue(undefined);
    renderFrame();
    await user.click(screen.getByRole("button", { name: "Déconnexion" }));
    expect(screen.getByRole("dialog", { name: "Déjà l'heure de partir ?" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Se déconnecter" }));
    expect(logout).toHaveBeenCalledOnce();
    expect(router.replace).toHaveBeenCalledWith("/connexion");
    expect(router.refresh).toHaveBeenCalled();
  });

  it("WD16 : « Annuler » referme la modale sans déconnecter", async () => {
    const user = userEvent.setup();
    renderFrame();
    await user.click(screen.getByRole("button", { name: "Déconnexion" }));
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(logout).not.toHaveBeenCalled();
  });
});
