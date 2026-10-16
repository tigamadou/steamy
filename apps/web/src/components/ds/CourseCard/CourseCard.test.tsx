import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

import { CourseCard, type CourseCardData } from "./CourseCard";

const PAID: CourseCardData = {
  href: "/parcours/robot-suiveur",
  title: "Construis ton robot suiveur de ligne",
  difficulty: "Intermédiaire",
  author: "Équipe Steamy",
  isFree: false,
  priceLabel: "15 000 F CFA",
  color: "var(--cat-robotique)",
  emoji: "🤖",
};

describe("CourseCard", () => {
  it("est un lien vers la fiche du parcours", () => {
    render(<CourseCard course={PAID} />);
    expect(screen.getByRole("link", { name: PAID.title })).toHaveAttribute("href", PAID.href);
    expect(screen.getByRole("heading", { level: 3, name: PAID.title })).toBeInTheDocument();
  });

  it("affiche la difficulté et le prix, sans note ni cœur en public", () => {
    render(<CourseCard course={PAID} />);
    expect(screen.getByText("Intermédiaire")).toBeInTheDocument();
    expect(screen.getByText("15 000 F CFA")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText(/note|avis|★/i)).not.toBeInTheDocument();
  });

  it("affiche la pastille « Gratuit » pour un parcours gratuit", () => {
    render(<CourseCard course={{ ...PAID, isFree: true, priceLabel: undefined }} />);
    expect(screen.getByText("Gratuit")).toBeInTheDocument();
  });

  it("propose le cœur quand onFav est fourni (lot 3)", async () => {
    const user = userEvent.setup();
    const onFav = vi.fn();
    render(<CourseCard course={PAID} onFav={onFav} favorited />);
    const heart = screen.getByRole("button", { name: /liste de souhaits/ });
    expect(heart).toHaveAttribute("aria-pressed", "true");
    await user.tab();
    expect(heart).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onFav).toHaveBeenCalledOnce();
  });

  it("affiche la progression d'un parcours suivi", () => {
    render(<CourseCard course={{ ...PAID, progress: 35 }} />);
    expect(screen.getByRole("progressbar", { name: "Ta progression" })).toHaveAttribute("aria-valuenow", "35");
  });

  it("prend la couleur robotique par défaut", () => {
    const { container } = render(<CourseCard course={{ ...PAID, color: undefined, emoji: undefined }} />);
    const media = container.querySelector<HTMLElement>("article > div");
    expect(media?.style.getPropertyValue("--card-color")).toBe("var(--cat-robotique)");
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(
      <div>
        <CourseCard course={PAID} />
        <CourseCard course={{ ...PAID, href: "/parcours/gratuit", isFree: true }} onFav={() => {}} />
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
