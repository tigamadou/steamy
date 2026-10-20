import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const router = { replace: vi.fn(), refresh: vi.fn() };
const logout = vi.fn();
let pathname = "/parent";
vi.mock("next/navigation", () => ({ usePathname: () => pathname, useRouter: () => router }));
vi.mock("@/lib/auth/logout", () => ({ logout: () => logout() }));
vi.mock("@/features/shell/unread-count", () => ({ useUnreadCount: (initial: number) => initial }));

const { ParentShellFrame } = await import("./ParentShellFrame");

function renderFrame() {
  return render(
    <ParentShellFrame user={{ firstName: "Marie", name: "Marie A.", subtitle: "Parent · Cotonou" }} unreadCount={2}>
      <p>Page</p>
    </ParentShellFrame>,
  );
}

describe("ParentShellFrame", () => {
  beforeEach(() => {
    pathname = "/parent";
    logout.mockReset();
    router.replace.mockReset();
    router.refresh.mockReset();
  });

  it("accueil : titre de bienvenue, entrée active, cloche vers WPD14, sans recherche", async () => {
    const { container } = renderFrame();
    expect(screen.getByRole("heading", { level: 1, name: "Bonjour Marie 👋" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Accueil" })[0]).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("navigation", { name: "Navigation de votre espace" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "2 notifications non lues" })).toHaveAttribute("href", "/parent/notifications");
    expect(screen.queryByRole("search")).toBeNull();
    expect(screen.getByText("Parent · Cotonou")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("WPD14 : aucune entrée active", () => {
    pathname = "/parent/notifications";
    renderFrame();
    expect(screen.getByRole("heading", { level: 1, name: "Notifications" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Accueil" })[0]).not.toHaveAttribute("aria-current");
  });

  it("déconnexion confirmée au vouvoiement, puis retour à la connexion", async () => {
    const user = userEvent.setup();
    logout.mockResolvedValue(undefined);
    renderFrame();
    await user.click(screen.getAllByRole("button", { name: "Déconnexion" })[0]);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent(/vous/i);
    await user.click(screen.getByRole("button", { name: "Se déconnecter" }));
    expect(logout).toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith("/connexion");
    expect(router.refresh).toHaveBeenCalled();
  });

  it("la modale de déconnexion se ferme sans déconnecter", async () => {
    const user = userEvent.setup();
    renderFrame();
    await user.click(screen.getAllByRole("button", { name: "Déconnexion" })[0]);
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(logout).not.toHaveBeenCalled();
  });
});
