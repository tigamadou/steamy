import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { MobileMenu } from "./MobileMenu";

async function openMenu(pathname = "/parcours/robotique") {
  render(<MobileMenu section="courses" pathname={pathname} />);
  const toggle = screen.getByRole("button", { name: "Menu" });
  await userEvent.click(toggle);
  return { toggle, dialog: screen.getByRole("dialog", { name: "Menu" }) };
}

describe("MobileMenu", () => {
  it("ouvre un tiroir modal avec toutes les entrées et le compte", async () => {
    const { toggle, dialog } = await openMenu();
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(
      within(dialog)
        .getAllByRole("link")
        .map((l) => l.textContent),
    ).toEqual([
      "Accueil",
      "Parcours",
      "Boutique",
      "Écoles",
      "Blog",
      "Événements",
      "Guides gratuits",
      "À propos",
      "Se connecter",
      "Créer un compte",
    ]);
    expect(within(dialog).getByRole("link", { name: "Parcours" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "Fermer le menu" })).toHaveFocus();
  });

  it("piège le focus dans le tiroir", async () => {
    const { dialog } = await openMenu();
    const close = screen.getByRole("button", { name: "Fermer le menu" });
    const signup = within(dialog).getByRole("link", { name: "Créer un compte" });

    await userEvent.tab({ shift: true });
    expect(signup).toHaveFocus();
    await userEvent.tab();
    expect(close).toHaveFocus();
    await userEvent.tab();
    expect(within(dialog).getByRole("link", { name: "Accueil" })).toHaveFocus();
    await userEvent.keyboard("a");
    expect(within(dialog).getByRole("link", { name: "Accueil" })).toHaveFocus();
  });

  it("se ferme à Échap et au bouton de fermeture, en rendant le focus au bouton « Menu »", async () => {
    const { toggle } = await openMenu();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(toggle).toHaveFocus();

    await userEvent.click(toggle);
    await userEvent.click(screen.getByRole("button", { name: "Fermer le menu" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(toggle).toHaveFocus();
  });

  it("se ferme au choix d'une entrée et au clic sur le voile", async () => {
    const { toggle, dialog } = await openMenu();
    await userEvent.click(within(dialog).getByRole("link", { name: "Blog" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.click(toggle);
    await userEvent.click(document.querySelector<HTMLElement>(".fixed > [aria-hidden]")!);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("marque la page courante", async () => {
    render(<MobileMenu section="about" pathname="/a-propos" />);
    await userEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(screen.getByRole("link", { name: "À propos" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Blog" })).not.toHaveAttribute("aria-current");
  });

  it("ne présente aucune violation d'accessibilité, ouvert", async () => {
    await openMenu(null as unknown as string);
    expect(await axe(document.body)).toHaveNoViolations();
  });
});
