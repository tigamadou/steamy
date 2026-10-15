import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { Accordion } from "./Accordion";

describe("Accordion", () => {
  // L'ouverture au clavier (Entrée, Espace sur le `summary`) est native : jsdom ne la simule pas,
  // le parcours Playwright la couvre. On vérifie ici le focus et la bascule.
  it("est fermé par défaut, focusable et s'ouvre au clic", async () => {
    const user = userEvent.setup();
    const { container } = render(<Accordion title="Comment payer ?">Par Mobile Money.</Accordion>);
    const details = container.querySelector("details");
    expect(details).not.toHaveAttribute("open");
    await user.tab();
    const summary = screen.getByText("Comment payer ?");
    expect(summary).toHaveFocus();
    await user.click(summary);
    expect(details).toHaveAttribute("open");
  });

  it("peut être ouvert par défaut", () => {
    const { container } = render(
      <Accordion title="Question" defaultOpen>
        Réponse
      </Accordion>,
    );
    expect(container.querySelector("details")).toHaveAttribute("open");
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(<Accordion title="Question">Réponse</Accordion>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
