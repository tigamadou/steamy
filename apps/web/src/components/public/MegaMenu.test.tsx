import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { MegaMenu } from "./MegaMenu";
import { RESOURCE_LINKS } from "./nav";

function setup(pathname: string | null = "/") {
  render(
    <>
      <MegaMenu label="Ressources" items={RESOURCE_LINKS} active={false} pathname={pathname} />
      <button type="button">Ailleurs</button>
    </>,
  );
  return screen.getByRole("button", { name: "Ressources" });
}

const links = () => screen.getAllByRole("link");

describe("MegaMenu", () => {
  it("s'ouvre au clic, sans se replier au survol, et se referme au second clic", async () => {
    const toggle = setup();
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();

    await userEvent.hover(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(links().map((l) => l.textContent)).toEqual(["📰Blog", "📅Événements", "📥Guides gratuits"]);
    expect(document.getElementById(toggle.getAttribute("aria-controls")!)).toBeVisible();

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("s'ouvre à Entrée et à Espace", async () => {
    const toggle = setup();
    toggle.focus();
    await userEvent.keyboard("{Enter}");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("se parcourt aux flèches, Début et Fin, et Échap rend le focus au bouton", async () => {
    const toggle = setup();
    toggle.focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(links()[0]).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    expect(links()[1]).toHaveFocus();
    await userEvent.keyboard("{ArrowUp}{ArrowUp}");
    expect(links()[2]).toHaveFocus();
    await userEvent.keyboard("{Home}");
    expect(links()[0]).toHaveFocus();
    await userEvent.keyboard("{End}");
    expect(links()[2]).toHaveFocus();
    await userEvent.keyboard("a");
    expect(links()[2]).toHaveFocus();

    await userEvent.keyboard("{Escape}");
    expect(toggle).toHaveFocus();
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("↑ sur le bouton ouvre sur la dernière entrée ; Échap sur le bouton ferme", async () => {
    const toggle = setup();
    toggle.focus();
    await userEvent.keyboard("{ArrowUp}");
    expect(links()[2]).toHaveFocus();
    toggle.focus();
    await userEvent.keyboard("{Escape}");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await userEvent.keyboard("{Escape}");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("se ferme au clic extérieur, quand le focus sort, et au choix d'une entrée", async () => {
    const toggle = setup();
    await userEvent.click(toggle);
    fireEvent.pointerDown(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(screen.getByRole("button", { name: "Ailleurs" }));
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(toggle);
    await userEvent.keyboard("{ArrowDown}");
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(toggle);
    fireEvent.click(links()[0]);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("marque la page courante et la rubrique d'une fiche", async () => {
    const toggle = setup("/evenements/atelier");
    await userEvent.click(toggle);
    expect(screen.getByRole("link", { name: /Événements/ })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: /Blog/ })).not.toHaveAttribute("aria-current");
  });

  it("met en avant la rubrique active", () => {
    render(<MegaMenu label="Ressources" items={RESOURCE_LINKS} active pathname="/blog" />);
    expect(screen.getByRole("button", { name: "Ressources" })).toHaveClass("text-primary-600");
  });

  it("ne présente aucune violation d'accessibilité, ouvert", async () => {
    const toggle = setup("/blog");
    await userEvent.click(toggle);
    expect(screen.getByRole("link", { name: /Blog/ })).toHaveAttribute("aria-current", "page");
    expect(await axe(toggle.parentElement!)).toHaveNoViolations();
  });
});
