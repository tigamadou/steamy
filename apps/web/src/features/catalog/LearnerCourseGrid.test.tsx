import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { course } from "@/test/api-fixtures";
import { toCourseCard } from "@/lib/format";

const addToWishlist = vi.fn();
const removeFromWishlist = vi.fn();
vi.mock("./api", async (original) => ({
  ...(await original<typeof import("./api")>()),
  addToWishlist,
  removeFromWishlist,
}));

const { LearnerCourseGrid } = await import("./LearnerCourseGrid");

const ITEMS = ["robot", "scratch"].map((slug) => ({
  slug,
  card: toCourseCard(course({ slug, title: `Parcours ${slug}` }), `/apprenant/catalogue/${slug}`),
}));

const heart = (title: string) => screen.getByRole("button", { name: `Ajouter « ${title} » à ma liste de souhaits` });

beforeEach(() => {
  addToWishlist.mockReset().mockResolvedValue({ ok: true, data: {} });
  removeFromWishlist.mockReset().mockResolvedValue({ ok: true, data: undefined });
});

describe("grille du catalogue de l'apprenant", () => {
  it("cartes vers WC04, cœurs reflétant les souhaits, carte « Gratuit »", () => {
    render(<LearnerCourseGrid items={ITEMS} wished={["robot"]} />);
    expect(screen.getByRole("link", { name: "Parcours robot" })).toHaveAttribute("href", "/apprenant/catalogue/robot");
    expect(heart("Parcours robot")).toHaveAttribute("aria-pressed", "true");
    expect(heart("Parcours scratch")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getAllByText("Gratuit")).toHaveLength(2);
  });

  it("ajout optimiste avec confirmation", async () => {
    const user = userEvent.setup();
    render(<LearnerCourseGrid items={ITEMS} wished={[]} />);
    await user.click(heart("Parcours scratch"));
    expect(heart("Parcours scratch")).toHaveAttribute("aria-pressed", "true");
    expect(addToWishlist).toHaveBeenCalledWith("scratch");
    expect(screen.getByRole("status")).toHaveTextContent("Parcours ajouté à tes souhaits");
  });

  it("ajout refusé : cœur rétabli et message de l'API", async () => {
    const user = userEvent.setup();
    addToWishlist.mockResolvedValue({ ok: false, code: "NOT_FOUND", message: "Parcours introuvable.", fields: {} });
    render(<LearnerCourseGrid items={ITEMS} wished={[]} />);
    await user.click(heart("Parcours robot"));
    expect(heart("Parcours robot")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("status")).toHaveTextContent("Parcours introuvable.");
  });

  it("retrait avec « Annuler » : le souhait revient par un nouveau PUT", async () => {
    const user = userEvent.setup();
    render(<LearnerCourseGrid items={ITEMS} wished={["robot"]} />);
    await user.click(heart("Parcours robot"));
    expect(heart("Parcours robot")).toHaveAttribute("aria-pressed", "false");
    expect(removeFromWishlist).toHaveBeenCalledWith("robot");
    const toast = screen.getByRole("status");
    expect(toast).toHaveTextContent("Parcours retiré des souhaits");
    await user.click(within(toast).getByRole("button", { name: "Annuler" }));
    expect(heart("Parcours robot")).toHaveAttribute("aria-pressed", "true");
    expect(addToWishlist).toHaveBeenCalledWith("robot");
  });

  it("annulation refusée : le retrait est maintenu", async () => {
    const user = userEvent.setup();
    addToWishlist.mockResolvedValue({ ok: false, code: "SERVER_ERROR", message: "", fields: {} });
    render(<LearnerCourseGrid items={ITEMS} wished={["robot"]} />);
    await user.click(heart("Parcours robot"));
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(heart("Parcours robot")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("status")).toHaveTextContent(/erreur est survenue de notre côté/);
  });
});
