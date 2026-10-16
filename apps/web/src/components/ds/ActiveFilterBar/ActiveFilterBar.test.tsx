import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { ActiveFilterBar } from "./ActiveFilterBar";

describe("ActiveFilterBar", () => {
  it("rien sans filtre", () => {
    const { container } = render(<ActiveFilterBar countLabel="9 parcours" filters={[]} clearHref="/c" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("compteur, puces retirables une à une et « Effacer les filtres » (WC02)", async () => {
    const { container } = render(
      <ActiveFilterBar
        countLabel="3 parcours"
        clearHref="/c"
        filters={[
          { id: "categorie", label: "Robotique", removeHref: "/c?difficulte=debutant" },
          { id: "difficulte", label: "Débutant", removeHref: "/c?categorie=robotique" },
        ]}
      />,
    );
    expect(screen.getByText("3 parcours")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retirer le filtre Robotique" })).toHaveAttribute(
      "href",
      "/c?difficulte=debutant",
    );
    expect(screen.getByRole("link", { name: "Retirer le filtre Débutant" })).toHaveAttribute(
      "href",
      "/c?categorie=robotique",
    );
    expect(screen.getByRole("link", { name: "Effacer les filtres" })).toHaveAttribute("href", "/c");
    expect(await axe(container)).toHaveNoViolations();
  });
});
