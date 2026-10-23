import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const router = { replace: vi.fn(), refresh: vi.fn() };
const logout = vi.fn();
let pathname = "/enseignant";
vi.mock("next/navigation", () => ({ usePathname: () => pathname, useRouter: () => router }));
vi.mock("@/lib/auth/logout", () => ({ logout: () => logout() }));
vi.mock("@/features/shell/unread-count", () => ({ useUnreadCount: (initial: number) => initial }));

const { TeacherShellFrame } = await import("./TeacherShellFrame");

function renderFrame() {
  return render(
    <TeacherShellFrame user={{ firstName: "Koffi", name: "Koffi A.", subtitle: "Enseignant" }} unreadCount={2}>
      <p>Page</p>
    </TeacherShellFrame>,
  );
}

describe("TeacherShellFrame", () => {
  beforeEach(() => {
    pathname = "/enseignant";
    logout.mockReset();
    router.replace.mockReset();
    router.refresh.mockReset();
  });

  it("accueil : titre de bienvenue, entrée active, cloche vers WT12, sans recherche", async () => {
    const { container } = renderFrame();
    expect(screen.getByRole("heading", { level: 1, name: "Bonjour Koffi 👋" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Accueil" })[0]).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("navigation", { name: "Navigation de votre espace" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "2 notifications non lues" })).toHaveAttribute(
      "href",
      "/enseignant/notifications",
    );
    expect(screen.queryByRole("search")).toBeNull();
    expect(screen.getByText("Enseignant")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("WT12 : aucune entrée active", () => {
    pathname = "/enseignant/notifications";
    renderFrame();
    expect(screen.getByRole("heading", { level: 1, name: "Notifications" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Accueil" })[0]).not.toHaveAttribute("aria-current");
  });

  it("déconnexion confirmée au vouvoiement, puis retour à la connexion", async () => {
    const user = userEvent.setup();
    logout.mockResolvedValue(undefined);
    renderFrame();
    await user.click(screen.getAllByRole("button", { name: "Déconnexion" })[0]);
    expect(screen.getByRole("dialog")).toHaveTextContent(/vous/i);
    await user.click(screen.getByRole("button", { name: "Se déconnecter" }));
    expect(logout).toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith("/connexion");
    expect(router.refresh).toHaveBeenCalled();
  });
});
