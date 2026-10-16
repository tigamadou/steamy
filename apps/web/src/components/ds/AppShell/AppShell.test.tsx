import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FormHTMLAttributes } from "react";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

import { AppShell, type AppShellProps } from "./AppShell";
import { AppShellSkeleton } from "./AppShellSkeleton";
import { HeaderSearch } from "./HeaderSearch";
import type { NavEntry } from "./NavItem";
import { NotificationBell, unreadLabel } from "./NotificationBell";

vi.mock("next/form", () => ({ default: (props: FormHTMLAttributes<HTMLFormElement>) => <form {...props} /> }));

const NAV: NavEntry[] = [
  { id: "home", icon: "home", label: "Accueil", href: "/apprenant" },
  { id: "courses", icon: "book", label: "Mes parcours", href: "/apprenant/parcours" },
  { id: "catalog", icon: "compass", label: "Catalogue", href: "/apprenant/catalogue" },
  { id: "wishlist", icon: "heart", label: "Mes souhaits", href: "/apprenant/souhaits" },
  { id: "badges", icon: "trophy", label: "Badges", href: "/apprenant/badges", hidden: true },
  { id: "profile", icon: "user", label: "Profil", href: "/apprenant/profil" },
];

function renderShell(props: Partial<AppShellProps> = {}) {
  const onLogout = vi.fn();
  const view = render(
    <AppShell
      nav={NAV}
      active="catalog"
      user={{ name: "Léa A.", subtitle: "4ᵉ · Cotonou", avatarEmoji: "🦊" }}
      headerTitle="Catalogue"
      headerSearch={<HeaderSearch action="/apprenant/catalogue" placeholder="Rechercher un parcours…" label="Rechercher un parcours" />}
      unreadCount={3}
      notificationsHref="/apprenant/notifications"
      profileHref="/apprenant/profil"
      navLabel="Navigation de ton espace"
      onLogout={onLogout}
      {...props}
    >
      <p>Contenu</p>
    </AppShell>,
  );
  return { ...view, onLogout };
}

describe("AppShell", () => {
  it("rend les entrées visibles seulement, l'active marquée par aria-current", async () => {
    const { container } = renderShell();
    const nav = screen.getByRole("navigation", { name: "Navigation de ton espace" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(["Accueil", "Mes parcours", "Catalogue", "Mes souhaits", "Profil"]);
    expect(within(nav).queryByText("Badges")).not.toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Catalogue" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Accueil" })).not.toHaveAttribute("aria-current");
    expect(container.querySelector('[title="Bientôt"]')).toBeNull();
    // La recherche est rendue deux fois (header ≥ 768 px, tiroir en dessous) : une seule est affichée, ce que jsdom
    // ne calcule pas. Playwright vérifie la page réelle avec axe à 360 px et sur bureau.
    expect(await axe(container, { rules: { "landmark-unique": { enabled: false } } })).toHaveNoViolations();
  });

  it("porte le titre de page, le profil et le contenu principal", () => {
    renderShell();
    expect(screen.getByRole("heading", { level: 1, name: "Catalogue" })).toBeInTheDocument();
    expect(screen.getByText("Léa A.")).toBeInTheDocument();
    expect(screen.getByText("4ᵉ · Cotonou")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mon profil" })).toHaveAttribute("href", "/apprenant/profil");
    expect(screen.getByRole("main")).toHaveTextContent("Contenu");
    expect(screen.getByRole("link", { name: "Aller au contenu" })).toHaveAttribute("href", "#contenu");
    expect(screen.getByRole("link", { name: "3 notifications non lues" })).toHaveAttribute("href", "/apprenant/notifications");
  });

  it("sans sous-titre ni recherche (espaces parent et enseignant)", () => {
    renderShell({ user: { name: "Marie A." }, headerSearch: undefined, headerActions: <button type="button">Action</button> });
    expect(screen.queryByRole("search")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Action" })).toBeInTheDocument();
  });

  it("le logo renvoie à la première entrée, ou à la racine sans navigation", () => {
    const { unmount } = renderShell();
    expect(screen.getByRole("link", { name: "Steamy" })).toHaveAttribute("href", "/apprenant");
    unmount();
    renderShell({ nav: [], active: null });
    expect(screen.getByRole("link", { name: "Steamy" })).toHaveAttribute("href", "/");
  });

  it("demande la déconnexion à l'appelant (WD16)", async () => {
    const user = userEvent.setup();
    const { onLogout } = renderShell();
    await user.click(screen.getByRole("button", { name: "Déconnexion" }));
    expect(onLogout).toHaveBeenCalledOnce();
  });

  it("ouvre le tiroir au clavier, et le referme par Échap en rendant le focus au menu", async () => {
    const user = userEvent.setup();
    renderShell();
    const menu = screen.getByRole("button", { name: "Ouvrir le menu" });
    expect(menu).toHaveAttribute("aria-expanded", "false");
    await user.click(menu);
    expect(menu).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Steamy" })).toHaveFocus();
    await user.keyboard("{Tab}");
    await user.keyboard("{Escape}");
    expect(menu).toHaveAttribute("aria-expanded", "false");
    expect(menu).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(menu).toHaveAttribute("aria-expanded", "false");
  });

  it("referme le tiroir par son bouton, le fond, une entrée ou la recherche", async () => {
    const user = userEvent.setup();
    const { container } = renderShell();
    const menu = screen.getByRole("button", { name: "Ouvrir le menu" });

    await user.click(menu);
    await user.click(screen.getByRole("button", { name: "Fermer le menu" }));
    expect(menu).toHaveAttribute("aria-expanded", "false");
    expect(menu).toHaveFocus();

    await user.click(menu);
    await user.click(container.querySelector(".bg-ink-900\\/40") as HTMLElement);
    expect(menu).toHaveAttribute("aria-expanded", "false");

    await user.click(menu);
    await user.click(within(screen.getByRole("navigation")).getByRole("link", { name: "Profil" }));
    expect(menu).toHaveAttribute("aria-expanded", "false");

    await user.click(menu);
    await user.click(screen.getByRole("button", { name: "Déconnexion" }));
    expect(menu).toHaveAttribute("aria-expanded", "false");
  });

  it("sous 768 px, le tiroir ouvert est une boîte modale : reste de la page inerte, Tab bouclé", async () => {
    const user = userEvent.setup();
    const { container } = renderShell();
    const menu = screen.getByRole("button", { name: "Ouvrir le menu" });
    await user.click(menu);
    const drawer = screen.getByRole("dialog", { name: "Menu" });
    expect(drawer).toHaveAttribute("aria-modal", "true");
    expect(container.querySelector("div[inert]")).toContainElement(screen.getByRole("main"));
    const logo = screen.getByRole("link", { name: "Steamy" });
    const logout = screen.getByRole("button", { name: "Déconnexion" });
    expect(logo).toHaveFocus();
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(logout).toHaveFocus();
    await user.keyboard("{Tab}");
    expect(logo).toHaveFocus();
    await user.keyboard("{Tab}");
    expect(logo).not.toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(container.querySelector("[inert]")).toBeNull();
  });

  it("le tiroir se ferme au passage à 768 px ou plus ; le lien d'évitement est inerte tant qu'il est ouvert", async () => {
    const user = userEvent.setup();
    let listener: () => void = () => {};
    const media = { matches: false, addEventListener: vi.fn((_: string, l: () => void) => (listener = l)), removeEventListener: vi.fn() };
    vi.stubGlobal("matchMedia", vi.fn(() => media));
    renderShell();
    const menu = screen.getByRole("button", { name: "Ouvrir le menu" });
    await user.click(menu);
    expect(screen.getByText("Aller au contenu")).toHaveAttribute("inert");
    media.matches = true;
    act(() => listener());
    expect(menu).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Aller au contenu")).not.toHaveAttribute("inert");
    expect(media.removeEventListener).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("WD16 depuis le tiroir : le focus passe au bouton de menu avant l'ouverture de la modale", async () => {
    const user = userEvent.setup();
    const { onLogout } = renderShell();
    const menu = screen.getByRole("button", { name: "Ouvrir le menu" });
    await user.click(menu);
    await user.click(screen.getByRole("button", { name: "Déconnexion" }));
    expect(onLogout).toHaveBeenCalledOnce();
    expect(menu).toHaveFocus();
  });
});

describe("NotificationBell", () => {
  it("affiche « 9+ » au-delà de 9 mais annonce le nombre exact", () => {
    render(<NotificationBell count={12} href="/n" />);
    const bell = screen.getByRole("link", { name: "12 notifications non lues" });
    expect(bell).toHaveTextContent("9+");
  });

  it("n'affiche pas de compteur sans non-lue", () => {
    render(<NotificationBell count={0} href="/n" />);
    expect(screen.getByRole("link", { name: "Notifications, aucune non lue" })).toHaveTextContent("");
  });

  it("accorde le libellé au singulier", () => {
    expect(unreadLabel(1)).toBe("1 notification non lue");
    expect(unreadLabel(5)).toBe("5 notifications non lues");
  });
});

describe("HeaderSearch", () => {
  it("envoie le terme dans `q` vers la page de résultats", () => {
    render(<HeaderSearch action="/apprenant/catalogue" placeholder="Rechercher un parcours…" label="Rechercher un parcours" />);
    const form = screen.getByRole("search");
    expect(form).toHaveAttribute("action", "/apprenant/catalogue");
    expect(screen.getByRole("searchbox", { name: "Rechercher un parcours" })).toHaveAttribute("name", "q");
  });
});

describe("AppShellSkeleton", () => {
  it("annonce le chargement sans donnée", () => {
    render(<AppShellSkeleton label="Chargement de ton espace…" navCount={3} />);
    expect(screen.getByRole("status", { name: "Chargement de ton espace…" })).toHaveAttribute("aria-busy", "true");
  });

  it("esquisse cinq entrées par défaut", () => {
    const { container } = render(<AppShellSkeleton label="Chargement" />);
    expect(container.querySelectorAll(".h-11")).toHaveLength(5);
  });
});
