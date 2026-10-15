import { render, screen, within } from "@testing-library/react";
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

  it("ne présente aucune violation d'accessibilité", async () => {
    render(<Toast tone="error" title="Échec de l'envoi" onClose={() => {}} />);
    expect(await axe(document.body)).toHaveNoViolations();
  });
});
