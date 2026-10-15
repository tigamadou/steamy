import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

import { Button } from "../Button";
import { Modal, type ModalProps } from "./Modal";

function Harness(props: Partial<ModalProps>) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Ouvrir
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Mot de passe oublié ?"
        icon="🔑"
        actions={
          <>
            <Button variant="outline">Je suis apprenant</Button>
            <Button>Je suis parent</Button>
          </>
        }
        {...props}
      >
        Dis-nous qui tu es.
      </Modal>
    </>
  );
}

describe("Modal", () => {
  it("ne rend rien quand elle est fermée", () => {
    render(<Modal open={false} onClose={() => {}} title="Titre">Corps</Modal>);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("s'ouvre dans un portail, nommée et décrite, focus sur le premier élément", async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Ouvrir" }));
    const dialog = screen.getByRole("dialog", { name: "Mot de passe oublié ?" });
    expect(container).not.toContainElement(dialog);
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleDescription("Dis-nous qui tu es.");
    expect(screen.getByRole("button", { name: "Fermer" })).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("piège le focus avec Tab et Maj+Tab", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Ouvrir" }));
    const close = screen.getByRole("button", { name: "Fermer" });
    const last = screen.getByRole("button", { name: "Je suis parent" });
    await user.tab({ shift: true });
    expect(last).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Je suis apprenant" })).toHaveFocus();
    await user.tab({ shift: true });
    expect(close).toHaveFocus();
    await user.keyboard("a");
    expect(close).toHaveFocus();
  });

  it("Maj+Tab depuis la boîte elle-même va au dernier élément", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Ouvrir" }));
    screen.getByRole("dialog").focus();
    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Je suis parent" })).toHaveFocus();
  });

  it("se ferme avec Échap et rend le focus et le défilement", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const opener = screen.getByRole("button", { name: "Ouvrir" });
    await user.click(opener);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
  });

  it("garde Échap et le piège de Tab quand l'élément focalisé disparaît", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Ouvrir" }));
    (document.activeElement as HTMLElement).blur();
    expect(document.activeElement).toBe(document.body);
    await user.tab();
    expect(screen.getByRole("button", { name: "Fermer" })).toHaveFocus();
    (document.activeElement as HTMLElement).blur();
    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Je suis parent" })).toHaveFocus();
    (document.activeElement as HTMLElement).blur();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("se ferme au clic sur le fond, pas sur la boîte", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Ouvrir" }));
    const dialog = screen.getByRole("dialog");
    await user.click(dialog);
    expect(dialog).toBeInTheDocument();
    await user.click(dialog.parentElement as HTMLElement);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("se ferme avec le bouton de fermeture au libellé personnalisé", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal open onClose={onClose} title="Refuser ?" closeLabel="Annuler" variant="danger" icon="⚠️">
        Le compte ne sera pas créé.
      </Modal>,
    );
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.getByRole("heading", { name: "Refuser ?" })).toHaveClass("text-error-700");
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    render(
      <Modal open onClose={() => {}} title="Mot de passe oublié ?" icon="🔑" actions={<Button>OK</Button>}>
        Dis-nous qui tu es.
      </Modal>,
    );
    expect(await axe(document.body)).toHaveNoViolations();
  });
});
