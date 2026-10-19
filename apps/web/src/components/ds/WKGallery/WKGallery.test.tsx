import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { WKGallery } from "./WKGallery";

describe("WKGallery", () => {
  it("grande image et vignettes : la vignette choisie devient la photo affichée", async () => {
    render(<WKGallery name="Steamy Bot" images={["/a.jpg", "/b.jpg"]} />);
    expect(screen.getByRole("img", { name: "Steamy Bot, photo 1 sur 2" })).toHaveAttribute("src", "/a.jpg");
    await userEvent.click(screen.getByRole("button", { name: "Afficher la photo 2" }));
    expect(screen.getByRole("img", { name: "Steamy Bot, photo 2 sur 2" })).toHaveAttribute("src", "/b.jpg");
    expect(screen.getByRole("button", { name: "Afficher la photo 2" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Afficher la photo 1" })).toHaveAttribute("aria-pressed", "false");
  });

  it("sans image : visuel de la catégorie, sans vignettes ; atténué en rupture", () => {
    const { container } = render(<WKGallery name="Bot" images={[]} emoji="🤖" dimmed />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("🤖")).toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass("opacity-60");
    expect(container.querySelector<HTMLElement>("[style]")?.style.getPropertyValue("--gallery-color")).toBe(
      "var(--cat-robotique)",
    );
  });

  it("une seule image : pas de vignettes", () => {
    render(<WKGallery name="Bot" images={["/a.jpg"]} color="#000" />);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(<WKGallery name="Bot" images={["/a.jpg", "/b.jpg"]} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
