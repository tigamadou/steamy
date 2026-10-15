import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { NavGroup } from "@/lib/backoffice/access";
import { axe } from "@/test/axe";

const logout = vi.fn();
const pathname = vi.fn(() => "/backoffice");
vi.mock("@/lib/auth/logout", () => ({ logout }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname() }));

const { AdminShell } = await import("./AdminShell");
const { AdminContent, AdminHeader } = await import("./AdminHeader");

const API = "http://api.test/admin";
const NAV: NavGroup[] = [
  {
    label: "Pilotage",
    items: [
      { id: "overview", label: "Vue d'ensemble", icon: "home", href: "/backoffice" },
      { id: "impact", label: "Impact Tracker", icon: "sparkle", href: "/backoffice/impact" },
    ],
  },
  {
    label: "Plateforme",
    items: [{ id: "shop", label: "Boutique", icon: "cart", href: `${API}/shop/`, external: true }],
  },
];

function renderShell() {
  return render(
    <AdminShell user={{ name: "Awa Sossou", groups: "Finance" }} nav={NAV} loginUrl="http://api.test/admin/login/">
      <AdminHeader title="Impact Tracker" actions={<button type="button">Exporter</button>} />
      <AdminContent>Contenu</AdminContent>
    </AdminShell>,
  );
}

describe("AdminShell", () => {
  beforeEach(() => {
    logout.mockReset();
    pathname.mockReturnValue("/backoffice");
  });

  it("présente la navigation groupée, l'utilisateur de la session et la page", () => {
    renderShell();
    const nav = screen.getByRole("navigation", { name: "Navigation du back-office" });
    expect(
      within(nav)
        .getAllByRole("heading", { level: 2 })
        .map((h) => h.textContent),
    ).toEqual(["Pilotage", "Plateforme"]);
    expect(within(nav).getByRole("link", { name: /^Boutique\s*\(admin Django\)$/ })).toHaveAttribute(
      "href",
      `${API}/shop/`,
    );
    expect(screen.getByText("Awa Sossou")).toBeInTheDocument();
    expect(screen.getByText("Finance")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Impact Tracker" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Exporter" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveTextContent("Contenu");
  });

  it.each([
    ["/backoffice", "Vue d'ensemble"],
    ["/backoffice/impact/indicateurs/nu", "Impact Tracker"],
  ])("marque l'entrée active pour %s", (path, active) => {
    pathname.mockReturnValue(path);
    renderShell();
    expect(screen.getByRole("link", { current: "page" })).toHaveTextContent(active);
    expect(screen.getAllByRole("link", { current: false })).toHaveLength(2);
  });

  it("replie le menu sous 1024 px : bouton, fond, Échap et clic sur une entrée", async () => {
    const user = userEvent.setup();
    const { container } = renderShell();
    const toggle = screen.getByRole("button", { name: "Menu du back-office" });
    const aside = screen.getByRole("complementary", { name: "Back-office" });
    expect(toggle).toHaveAttribute("aria-controls", aside.id);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(aside).toHaveClass("max-lg:invisible");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(aside).toHaveClass("max-lg:translate-x-0");
    await user.keyboard("{Escape}");
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);
    await user.click(container.querySelector(".bg-ink-900\\/40")!);
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);
    await user.keyboard("{Enter}");
    await user.click(screen.getByRole("link", { name: "Impact Tracker" }));
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("déconnecte puis ouvre la connexion du personnel", async () => {
    const assign = vi.fn();
    vi.spyOn(window, "location", "get").mockReturnValue({ ...window.location, assign });
    logout.mockResolvedValue(undefined);
    renderShell();
    await userEvent.click(screen.getByRole("button", { name: "Se déconnecter" }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("http://api.test/admin/login/"));
    vi.restoreAllMocks();
  });

  it("signale l'échec de la déconnexion", async () => {
    logout.mockRejectedValue(new Error("réseau"));
    renderShell();
    await userEvent.click(screen.getByRole("button", { name: "Se déconnecter" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("La déconnexion a échoué. Merci de réessayer.");
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = renderShell();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("AdminHeader hors du shell", () => {
  it("n'affiche pas de bouton de menu", () => {
    render(<AdminHeader title="Accès refusé" />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("heading", { level: 1, name: "Accès refusé" })).toBeInTheDocument();
  });
});
