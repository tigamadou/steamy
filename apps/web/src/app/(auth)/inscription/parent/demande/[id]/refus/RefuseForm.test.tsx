import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const POST = vi.fn();
const router = { replace: vi.fn() };
const retry = vi.fn();
const REASONS = [
  { id: 1, code: "too-young", label: "Trop jeune" },
  { id: 2, code: "other", label: "Autre raison" },
];
const useReferential = vi.fn(() => ({ items: REASONS as object[] | undefined, status: "ready", retry }));
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ POST }) }));
vi.mock("@/lib/use-referential", () => ({ useReferential }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const { RefuseForm } = await import("./RefuseForm");

const respond = (status: number, body: object = {}) => ({ ...body, response: new Response(null, { status }) });

async function fillAndSubmit(note = "") {
  const user = userEvent.setup();
  await user.selectOptions(screen.getByRole("combobox", { name: /Motif du refus/ }), "too-young");
  if (note) await user.type(screen.getByRole("textbox", { name: /Précisions/ }), note);
  await user.click(screen.getByRole("button", { name: "Confirmer le refus" }));
  return user;
}

describe("RefuseForm (WP11)", () => {
  beforeEach(() => {
    POST.mockReset();
    router.replace.mockReset();
    useReferential.mockClear();
  });

  it("exige un motif sans ouvrir la confirmation", async () => {
    const { container } = render(<RefuseForm id={7} firstName="Awa" />);
    expect(useReferential).toHaveBeenCalledWith("refusal-reasons");
    await userEvent.click(screen.getByRole("button", { name: "Confirmer le refus" }));
    expect(await screen.findAllByText("Choisissez un motif.")).not.toHaveLength(0);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
    // Choisir un motif efface l'erreur
    await userEvent.selectOptions(screen.getByRole("combobox", { name: /Motif du refus/ }), "other");
    expect(screen.queryByText("Choisissez un motif.")).not.toBeInTheDocument();
  });

  it("demande confirmation puis envoie le motif et les précisions nettoyées", async () => {
    POST.mockResolvedValue(respond(200, { data: { id: 7, status: "refused" } }));
    // Formulaire dans le `main` de la page, modale en portail : la page entière est vérifiée
    render(<RefuseForm id={7} firstName="Awa" />, { wrapper: ({ children }) => <main>{children}</main> });
    const user = await fillAndSubmit("  Tu es trop jeune  ");
    const dialog = screen.getByRole("dialog", { name: "Refuser la demande de Awa ?" });
    expect(within(dialog).getByRole("heading", { name: "Refuser la demande de Awa ?" })).toHaveClass("text-error-700");
    expect(dialog).toHaveTextContent("Votre enfant pourra vous refaire une demande dans 30 jours.");
    expect(await axe(document.body)).toHaveNoViolations();
    await user.click(within(dialog).getByRole("button", { name: "Refuser la demande" }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/inscription/parent/demande/7/refusee"));
    expect(POST).toHaveBeenCalledWith("/api/accounts/consent-requests/{id}/refuse/", {
      params: { path: { id: "7" } },
      body: { reason: "too-young", note: "Tu es trop jeune" },
    });
  });

  it("referme la confirmation avec « Revenir » sans rien envoyer", async () => {
    render(<RefuseForm id={7} firstName="Awa" />);
    const user = await fillAndSubmit();
    await user.click(screen.getByRole("button", { name: "Revenir" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(POST).not.toHaveBeenCalled();
  });

  it("referme la confirmation avec Échap", async () => {
    render(<RefuseForm id={7} firstName="Awa" />);
    const user = await fillAndSubmit();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("affiche l'erreur du motif renvoyée par l'API", async () => {
    POST.mockResolvedValue(
      respond(400, {
        error: { code: "VALIDATION_ERROR", message: "Données invalides.", fields: { reason: [{ message: "Motif inconnu." }] } },
      }),
    );
    render(<RefuseForm id={7} firstName="Awa" />);
    const user = await fillAndSubmit();
    await user.click(screen.getByRole("button", { name: "Refuser la demande" }));
    expect(await screen.findByText("Motif inconnu.")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("affiche une autre erreur en vouvoyant", async () => {
    POST.mockResolvedValue(respond(409, { error: { code: "CONSENT_ALREADY_RESOLVED", message: "" } }));
    render(<RefuseForm id={7} firstName="Awa" />);
    const user = await fillAndSubmit();
    await user.click(screen.getByRole("button", { name: "Refuser la demande" }));
    expect(await screen.findByText("Une erreur est survenue. Réessayez.")).toBeInTheDocument();
  });

  it("annule vers la demande (WP05)", () => {
    render(<RefuseForm id={7} firstName="Awa" />);
    expect(screen.getByRole("link", { name: "Annuler" })).toHaveAttribute("href", "/inscription/parent/demande/7");
  });

  it("affiche le chargement d'un référentiel encore inactif", () => {
    useReferential.mockReturnValueOnce({ items: undefined, status: "idle", retry });
    render(<RefuseForm id={7} firstName="Awa" />);
    const select = screen.getByRole("combobox", { name: /Motif du refus/ });
    expect(select).toBeDisabled();
    expect(within(select).getByRole("option", { name: "Chargement…" })).toBeInTheDocument();
  });
});
