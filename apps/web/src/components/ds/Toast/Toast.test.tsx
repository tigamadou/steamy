import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

import { Toast, type ToastTone } from "./Toast";

describe("Toast", () => {
  it("s'affiche dans un portail, annoncé poliment", () => {
    const { container } = render(<Toast title="Parcours ajouté à ta liste" />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent("Parcours ajouté à ta liste");
    expect(container).not.toContainElement(status);
    expect(status.parentElement).toBe(document.body);
  });

  it("ne rend rien côté serveur (pas de document pour le portail)", () => {
    expect(renderToString(<Toast title="Envoyé" />)).toBe("");
  });

  it.each(["success", "error", "warning", "info"] as ToastTone[])("rend le ton %s", (tone) => {
    render(<Toast tone={tone} title="Message" />);
    expect(screen.getByRole("status")).toHaveTextContent("Message");
  });

  it("se ferme au clavier", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Toast title="Envoyé" onClose={onClose} />);
    const close = within(screen.getByRole("status")).getByRole("button", { name: "Fermer" });
    await user.tab();
    expect(close).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("signale survol et focus pour suspendre sa disparition", () => {
    const onHoldChange = vi.fn();
    render(<Toast title="Retiré" onClose={() => {}} action={<button type="button">Annuler</button>} onHoldChange={onHoldChange} />);
    const box = screen.getByRole("status").firstElementChild as HTMLElement;
    fireEvent.pointerEnter(box);
    expect(onHoldChange).toHaveBeenLastCalledWith(true);
    fireEvent.pointerLeave(box);
    expect(onHoldChange).toHaveBeenLastCalledWith(false);
    const undo = screen.getByRole("button", { name: "Annuler" });
    const close = screen.getByRole("button", { name: "Fermer" });
    act(() => undo.focus());
    expect(onHoldChange).toHaveBeenLastCalledWith(true);
    // D'un bouton du toast à l'autre : toujours tenu
    act(() => close.focus());
    expect(onHoldChange).toHaveBeenLastCalledWith(true);
    act(() => close.blur());
    expect(onHoldChange).toHaveBeenLastCalledWith(false);
  });

  it("sans onHoldChange, survol et focus ne plantent pas", () => {
    render(<Toast title="Envoyé" onClose={() => {}} />);
    const box = screen.getByRole("status").firstElementChild as HTMLElement;
    fireEvent.pointerEnter(box);
    fireEvent.pointerLeave(box);
    act(() => screen.getByRole("button", { name: "Fermer" }).focus());
    act(() => screen.getByRole("button", { name: "Fermer" }).blur());
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    render(<Toast tone="error" title="Échec de l'envoi" onClose={() => {}} />);
    expect(await axe(document.body)).toHaveNoViolations();
  });
});
