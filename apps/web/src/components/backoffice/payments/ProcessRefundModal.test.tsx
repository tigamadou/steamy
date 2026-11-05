import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

import { backofficeRefund } from "./fixtures";

const refresh = vi.fn();
const post = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ POST: post }) }));

const { ProcessRefundModal } = await import("./ProcessRefundModal");

const onDone = vi.fn();
const ok = () => ({ data: { refund: backofficeRefund({ processed: true }), orderRefunded: false }, response: new Response(null, { status: 200 }) });
const fail = (status: number, error: object) => ({ error, response: new Response(null, { status }) });
const trigger = () => screen.getByRole("button", { name: /Marquer comme remboursé/ });
const reference = () => screen.getByLabelText(/Référence du remboursement/);
const confirm = () => screen.getByRole("button", { name: "Confirmer" });

async function open() {
  render(<ProcessRefundModal refund={backofficeRefund({ id: 5 })} onDone={onDone} />);
  await userEvent.click(trigger());
  return screen.getByRole("dialog", { name: "Marquer comme remboursé" });
}

describe("ProcessRefundModal", () => {
  beforeEach(() => {
    refresh.mockReset();
    onDone.mockReset();
    post.mockReset().mockResolvedValue(ok());
  });

  it("rappelle le montant et la commande, avec l'aide sur la référence", async () => {
    const dialog = await open();
    expect(dialog).toHaveTextContent(/Remboursement de 10\s000\sFCFA sur la commande CMD-7001\./);
    expect(within(dialog).getByText("Référence saisie dans le tableau de bord FedaPay ou chez l'opérateur")).toBeInTheDocument();
    expect(await axe(dialog)).toHaveNoViolations();
  });

  it("refuse une référence vide sans appeler l'API", async () => {
    await open();
    await userEvent.click(confirm());
    expect(screen.getByText("La référence du remboursement est obligatoire.")).toBeInTheDocument();
    await userEvent.type(reference(), "   ");
    await userEvent.click(confirm());
    expect(screen.getByText("La référence du remboursement est obligatoire.")).toBeInTheDocument();
    expect(reference()).toBeInvalid();
    expect(post).not.toHaveBeenCalled();
  });

  it("envoie la référence, ferme, rafraîchit et annonce le résultat", async () => {
    await open();
    await userEvent.type(reference(), "  FDP-REM-0042 ");
    await userEvent.click(confirm());
    expect(post).toHaveBeenCalledWith("/api/backoffice/refunds/{id}/process/", {
      params: { path: { id: 5 } },
      body: { reference: "FDP-REM-0042" },
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
    expect(onDone).toHaveBeenCalledWith({ tone: "info", text: "Remboursement de la commande CMD-7001 marqué comme fait." });
  });

  it("déjà fait (409) : message dédié, liste rafraîchie", async () => {
    post.mockResolvedValue(fail(409, { code: "VALIDATION_ERROR", message: "Ce remboursement est déjà marqué comme fait." }));
    await open();
    await userEvent.type(reference(), "FDP-1");
    await userEvent.click(confirm());
    expect(onDone).toHaveBeenCalledWith({ tone: "error", text: "Ce remboursement est déjà marqué comme remboursé." });
    expect(refresh).toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("affiche l'erreur de champ de l'API sous la référence", async () => {
    post.mockResolvedValue(
      fail(400, { code: "VALIDATION_ERROR", message: "Invalide.", fields: { reference: [{ code: "blank", message: "Ce champ est obligatoire." }] } }),
    );
    await open();
    await userEvent.type(reference(), "X");
    await userEvent.click(confirm());
    expect(screen.getByText("Ce champ est obligatoire.")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
  });

  it("affiche un autre échec en alerte dans la modale", async () => {
    post.mockResolvedValue(fail(400, { code: "VALIDATION_ERROR", message: "La référence du remboursement est obligatoire." }));
    await open();
    await userEvent.type(reference(), "X");
    await userEvent.click(confirm());
    expect(within(screen.getByRole("dialog")).getByRole("alert")).toHaveTextContent("La référence du remboursement est obligatoire.");
  });

  it("se replie sur le texte de l'écran sans message de l'API", async () => {
    post.mockResolvedValue(fail(500, { code: "SERVER_ERROR", message: "" }));
    await open();
    await userEvent.type(reference(), "X");
    await userEvent.click(confirm());
    expect(within(screen.getByRole("dialog")).getByRole("alert")).toHaveTextContent("Une erreur est survenue de notre côté");
  });

  it("annonce un réseau injoignable", async () => {
    post.mockRejectedValue(new Error("réseau"));
    await open();
    await userEvent.type(reference(), "X");
    await userEvent.click(confirm());
    expect(within(screen.getByRole("dialog")).getByRole("alert")).toHaveTextContent("Le serveur est injoignable");
  });

  it("session expirée : rafraîchit pour passer par la connexion", async () => {
    post.mockResolvedValue(fail(401, { code: "NOT_AUTHENTICATED", message: "" }));
    await open();
    await userEvent.type(reference(), "X");
    await userEvent.click(confirm());
    expect(refresh).toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });

  it("se ferme sans appel (Échap, Annuler) et repart d'une saisie vierge", async () => {
    await open();
    await userEvent.type(reference(), "Brouillon");
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await userEvent.click(trigger());
    expect(reference()).toHaveValue("");
    await userEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });
});
