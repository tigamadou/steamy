import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { Tabs } from "./Tabs";

const ITEMS = [
  { href: "/legal/cgu", label: "CGU" },
  { href: "/legal/mentions-legales", label: "Mentions légales" },
  { href: "/legal/confidentialite", label: "Confidentialité" },
];

describe("Tabs", () => {
  it("rend des liens adressables et marque l'onglet courant", () => {
    render(<Tabs items={ITEMS} activeHref="/legal/mentions-legales" label="Documents légaux" />);
    expect(screen.getByRole("navigation", { name: "Documents légaux" })).toBeInTheDocument();
    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual(ITEMS.map((item) => item.href));
    expect(screen.getByRole("link", { name: "Mentions légales" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "CGU" })).not.toHaveAttribute("aria-current");
  });

  it("se parcourt au clavier", async () => {
    const user = userEvent.setup();
    render(<Tabs items={ITEMS} activeHref="/legal/cgu" label="Documents légaux" />);
    await user.tab();
    expect(screen.getByRole("link", { name: "CGU" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("link", { name: "Mentions légales" })).toHaveFocus();
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(<Tabs items={ITEMS} activeHref="/legal/cgu" label="Documents légaux" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
