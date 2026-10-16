import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { LogoutModal } from "./LogoutModal";

describe("LogoutModal (WD16)", () => {
  it("fermée, ne rend rien", () => {
    render(<LogoutModal open={false} onClose={() => {}} onConfirm={async () => {}} register="tu" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("au tutoiement : Annuler ferme, Échap ferme", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<LogoutModal open onClose={onClose} onConfirm={async () => {}} register="tu" />);
    const dialog = screen.getByRole("dialog", { name: "Déjà l'heure de partir ?" });
    expect(dialog).toHaveTextContent("Tu seras déconnecté·e de Steamy sur cet appareil.");
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("confirme la déconnexion", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn(async () => {});
    render(<LogoutModal open onClose={() => {}} onConfirm={onConfirm} register="vous" />);
    expect(screen.getByRole("dialog")).toHaveTextContent("Vous serez déconnecté·e");
    await user.click(screen.getByRole("button", { name: "Se déconnecter" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(screen.getByRole("alert")).toBeEmptyDOMElement();
  });

  it("affiche l'échec dans le registre de l'espace, effacé à la fermeture", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const failing = async () => {
      throw new Error("réseau");
    };
    const { rerender } = render(<LogoutModal open onClose={onClose} onConfirm={failing} register="tu" />);
    await user.click(screen.getByRole("button", { name: "Se déconnecter" }));
    expect(await screen.findByText("La déconnexion a échoué. Réessaie.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(onClose).toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeEmptyDOMElement();
    rerender(<LogoutModal open onClose={onClose} onConfirm={failing} register="vous" />);
    await user.click(screen.getByRole("button", { name: "Se déconnecter" }));
    expect(await screen.findByText("La déconnexion a échoué. Réessayez.")).toBeInTheDocument();
  });
});
