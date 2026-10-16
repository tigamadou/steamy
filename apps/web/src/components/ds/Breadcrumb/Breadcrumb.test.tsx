import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { Breadcrumb } from "./Breadcrumb";

const ITEMS = [{ label: "Blog", href: "/blog" }, { label: "Robotique" }, { label: "Débuter en robotique" }];

describe("Breadcrumb", () => {
  it("relie les étapes et marque la page courante", () => {
    render(<Breadcrumb items={ITEMS} />);
    expect(screen.getByRole("navigation", { name: "Fil d'Ariane" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Blog" })).toHaveAttribute("href", "/blog");
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText("Débuter en robotique")).toHaveAttribute("aria-current", "page");
  });

  it("a une variante monochrome sans couleur primaire", () => {
    render(<Breadcrumb tone="ink" items={[{ label: "Impact Tracker", href: "/backoffice/impact" }, { label: "Rapport" }]} />);
    const link = screen.getByRole("link", { name: "Impact Tracker" });
    expect(link.className).toMatch(/outline-ink-900/);
    expect(link.className).not.toMatch(/primary/);
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(<Breadcrumb items={ITEMS} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
