import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { FaqAccordion, filterFaq, type FaqTheme } from "./FaqAccordion";

const THEMES: FaqTheme[] = [
  {
    title: "Paiement",
    items: [
      { question: "Quels moyens de paiement ?", answer: "Le Mobile Money uniquement." },
      { question: "Puis-je être remboursé ?", answer: "Oui, sous quatorze jours." },
    ],
  },
  {
    title: "Livraison",
    items: [{ question: "Livrez-vous à Lomé ?", answer: "Oui, au Togo et au Bénin." }],
  },
];

describe("filterFaq", () => {
  it("cherche sans tenir compte des accents ni de la casse", () => {
    expect(filterFaq(THEMES, "REMBOURSE")).toEqual([{ title: "Paiement", items: [THEMES[0].items[1]] }]);
    expect(filterFaq(THEMES, "bénin")[0].title).toBe("Livraison");
    expect(filterFaq(THEMES, "  ")).toBe(THEMES);
  });
});

describe("FaqAccordion", () => {
  it("ancre chaque thème qui porte un identifiant", () => {
    const { container } = render(<FaqAccordion themes={[{ ...THEMES[0], id: "faq-paiement" }, THEMES[1]]} />);
    expect(container.querySelector("#faq-paiement")).toContainElement(
      screen.getByRole("heading", { name: "Paiement" }),
    );
    expect(container.querySelectorAll("section[id]")).toHaveLength(1);
  });

  it("regroupe les questions par thème", () => {
    render(<FaqAccordion themes={THEMES} />);
    expect(screen.getByRole("heading", { name: "Paiement" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Livraison" })).toBeInTheDocument();
    expect(screen.getAllByRole("group")).toHaveLength(3);
  });

  it("filtre localement et ouvre les réponses trouvées", async () => {
    const user = userEvent.setup();
    render(<FaqAccordion themes={THEMES} searchable />);
    await user.type(screen.getByRole("searchbox", { name: "Rechercher dans la FAQ" }), "lome");
    expect(screen.queryByRole("heading", { name: "Paiement" })).not.toBeInTheDocument();
    const details = screen.getByText("Livrez-vous à Lomé ?").closest("details");
    expect(details).toHaveAttribute("open");
  });

  it("annonce une recherche sans résultat", async () => {
    const user = userEvent.setup();
    render(<FaqAccordion themes={THEMES} searchable emptyMessage="Aucun résultat." />);
    await user.type(screen.getByRole("searchbox"), "dinosaure");
    expect(screen.getByText("Aucun résultat.")).toBeInTheDocument();
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(<FaqAccordion themes={THEMES} searchable />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
