import type { Schemas } from "@steamy/api-client";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const POST = vi.fn();
const DELETE = vi.fn();
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ POST, DELETE }) }));

const { AccountDeletion } = await import("./AccountDeletion");

function deletion(overrides: Partial<Schemas["DeletionRequest"]> = {}): Schemas["DeletionRequest"] {
  return {
    id: 3,
    accountId: 7,
    firstName: "Léa",
    status: "pending_parent",
    reason: null,
    note: "",
    requestedByLearner: true,
    scheduledFor: null,
    createdAt: "2026-10-16T09:00:00Z",
    resolvedAt: null,
    ...overrides,
  };
}

const respond = (status: number, body: object = {}) => ({ ...body, response: new Response(null, { status }) });
const failure = (status: number, code: string, fields?: Record<string, string>) =>
  respond(status, {
    error: {
      code,
      message: "",
      fields: fields && Object.fromEntries(Object.entries(fields).map(([name, text]) => [name, [{ message: text }]])),
    },
  });

const send = () => userEvent.click(screen.getByRole("button", { name: "Envoyer la demande" }));

describe("AccountDeletion (WD15)", () => {
  beforeEach(() => {
    POST.mockReset();
    DELETE.mockReset();
  });

  it("règle D40 (J+30, factures conservées), motif facultatif, envoi → « Demande envoyée à ton parent »", async () => {
    POST.mockResolvedValue(respond(201, { data: deletion() }));
    const { container } = render(<AccountDeletion initial={null} />);
    expect(screen.getByRole("heading", { level: 2, name: "Supprimer ton compte ?" })).toBeInTheDocument();
    expect(screen.getByText(/30 jours plus tard \(J\+30\)/)).toBeInTheDocument();
    expect(screen.getByText("Les factures de tes commandes sont conservées.")).toBeInTheDocument();
    expect(screen.queryByText(/irréversible|inscription définitive/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Annuler" })).toHaveAttribute("href", "/apprenant/profil");
    expect(await axe(container)).toHaveNoViolations();

    await userEvent.type(screen.getByRole("textbox", { name: /Pourquoi pars-tu/ }), " Je n'ai plus le temps. ");
    await send();
    expect(POST).toHaveBeenCalledWith("/api/accounts/me/deletion-request/", { body: { note: "Je n'ai plus le temps." } });
    const heading = await screen.findByRole("heading", { name: "Demande envoyée à ton parent" });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(screen.getByText(/Tu l'as envoyée le 16 octobre 2026/)).toBeInTheDocument();
  });

  it("demande en attente : annulation → formulaire de nouveau, avec confirmation", async () => {
    DELETE.mockResolvedValue(respond(204));
    render(<AccountDeletion initial={deletion()} />);
    const heading = screen.getByRole("heading", { name: "Demande envoyée à ton parent" });
    expect(heading).not.toHaveFocus();
    expect(screen.getByRole("link", { name: "Retour au profil" })).toHaveAttribute("href", "/apprenant/profil");
    await userEvent.click(screen.getByRole("button", { name: "Annuler ma demande" }));
    expect(DELETE).toHaveBeenCalledWith("/api/accounts/me/deletion-request/");
    expect(await screen.findByRole("button", { name: "Envoyer la demande" })).toBeInTheDocument();
    expect(screen.getByText("Ta demande de suppression est annulée.")).toBeInTheDocument();
    // Focus rendu au titre du formulaire (WCAG 2.4.3)
    await waitFor(() => expect(screen.getByRole("heading", { name: "Supprimer ton compte ?" })).toHaveFocus());
  });

  it("demande validée par le parent : état dédié, date d'anonymisation de l'API, sans formulaire", () => {
    const { unmount } = render(
      <AccountDeletion initial={deletion({ status: "scheduled", scheduledFor: "2026-11-15T10:00:00Z" })} />,
    );
    expect(screen.getByRole("heading", { name: "Suppression validée par ton parent" })).toBeInTheDocument();
    expect(screen.getByText(/sera anonymisé le 15 novembre 2026/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Envoyer la demande" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Annuler ma demande" })).not.toBeInTheDocument();
    unmount();
    render(<AccountDeletion initial={deletion({ status: "scheduled", scheduledFor: null })} />);
    expect(screen.getByText(/sera bientôt anonymisé/)).toBeInTheDocument();
  });

  it("annulation refusée : le parent a déjà répondu, ou panne", async () => {
    DELETE.mockResolvedValueOnce(failure(404, "NOT_FOUND")).mockResolvedValueOnce(failure(500, "SERVER_ERROR"));
    render(<AccountDeletion initial={deletion()} />);
    await userEvent.click(screen.getByRole("button", { name: "Annuler ma demande" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Ton parent a déjà répondu à ta demande");
    await userEvent.click(screen.getByRole("button", { name: "Annuler ma demande" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/Une erreur est survenue de notre côté/));
  });

  it("demande refusée par le parent : signalée, nouvelle demande possible", () => {
    render(<AccountDeletion initial={deletion({ status: "refused" })} />);
    expect(screen.getByText(/Ton parent a refusé ta demande précédente/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Envoyer la demande" })).toBeEnabled();
  });

  it("demande annulée : formulaire, sans mention de refus", () => {
    render(<AccountDeletion initial={deletion({ status: "cancelled" })} />);
    expect(screen.queryByText(/refusé/)).not.toBeInTheDocument();
  });

  it("erreur sur le motif, puis panne réseau", async () => {
    POST.mockResolvedValueOnce(failure(400, "VALIDATION_ERROR", { note: "Trop long." }));
    POST.mockRejectedValueOnce(new TypeError("fetch failed"));
    render(<AccountDeletion initial={null} />);
    await send();
    expect(await screen.findByRole("link", { name: "Trop long." })).toHaveAttribute("href", "#pourquoi");
    expect(POST).toHaveBeenCalledWith("/api/accounts/me/deletion-request/", { body: { note: "" } });
    await send();
    expect(await screen.findByText(/Le serveur est injoignable/)).toBeInTheDocument();
  });
});
