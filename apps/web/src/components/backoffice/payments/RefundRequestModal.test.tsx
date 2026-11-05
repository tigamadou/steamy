import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const refresh = vi.fn();
const post = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ POST: post }) }));

const { RefundRequestModal } = await import("./RefundRequestModal");

const ok = () => ({ data: {}, response: new Response(null, { status: 201 }) });
const fail = (status: number, error: object) => ({ error, response: new Response(null, { status }) });
const trigger = () => screen.queryByRole("button", { name: "Demander un remboursement" });

async function open(refundable = 34000) {
  const view = render(<RefundRequestModal paymentId={7} status="succeeded" refundable={refundable} />);
  await userEvent.click(trigger() as HTMLElement);
  return { ...view, dialog: screen.getByRole("dialog", { name: "Demander un remboursement" }) };
}
const amountField = () => screen.getByLabelText(/Montant \(FCFA\)/);
const reasonField = () => screen.getByLabelText(/Motif/);
const submit = () => screen.getByRole("button", { name: "Demander le remboursement" });

describe("RefundRequestModal", () => {
  beforeEach(() => {
    refresh.mockReset();
    post.mockReset().mockResolvedValue(ok());
  });

  it("n'est proposé que pour un paiement réussi dont il reste quelque chose à rembourser", () => {
    const { rerender } = render(<RefundRequestModal paymentId={7} status="failed" refundable={0} />);
    expect(trigger()).not.toBeInTheDocument();
    rerender(<RefundRequestModal paymentId={7} status="pending" refundable={500} />);
    expect(trigger()).not.toBeInTheDocument();
    rerender(<RefundRequestModal paymentId={7} status="succeeded" refundable={0} />);
    expect(trigger()).not.toBeInTheDocument();
    rerender(<RefundRequestModal paymentId={7} status="succeeded" refundable={500} />);
    expect(trigger()).toBeInTheDocument();
  });

  it("préremplit le montant au reste remboursable, accessible", async () => {
    const { dialog } = await open();
    expect(amountField()).toHaveValue("34000");
    expect(reasonField()).toHaveValue("");
    expect(within(dialog).getByText(/Reste remboursable : 34\sB?000\sFCFA/)).toBeInTheDocument();
    expect(await axe(dialog)).toHaveNoViolations();
  });

  it("refuse un motif vide sans appeler l'API", async () => {
    await open();
    await userEvent.click(submit());
    expect(screen.getByText("Le motif est obligatoire.")).toBeInTheDocument();
    await userEvent.type(reasonField(), "   ");
    await userEvent.click(submit());
    expect(screen.getByText("Le motif est obligatoire.")).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it.each(["0", "34001", "12,5", "abc", ""])("refuse le montant « %s » sans appeler l'API", async (value) => {
    await open();
    await userEvent.clear(amountField());
    if (value) await userEvent.type(amountField(), value);
    await userEvent.type(reasonField(), "Doublon");
    await userEvent.click(submit());
    expect(screen.getByText(/Saisissez un montant entier entre 1 et/)).toBeInTheDocument();
    expect(amountField()).toBeInvalid();
    expect(post).not.toHaveBeenCalled();
  });

  it("envoie le corps exact, ferme la modale, rafraîchit et annonce la demande", async () => {
    await open();
    await userEvent.clear(amountField());
    await userEvent.type(amountField(), "10 000");
    await userEvent.type(reasonField(), "  Kit défectueux ");
    await userEvent.click(submit());
    expect(post).toHaveBeenCalledWith("/api/backoffice/payments/{id}/refunds/", {
      params: { path: { id: 7 } },
      body: { amount: 10000, reason: "Kit défectueux" },
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Remboursement demandé : il apparaît dans les remboursements à traiter.");
  });

  it("garde l'annonce quand le reste tombe à zéro et que le bouton disparaît", async () => {
    const { rerender } = await open();
    await userEvent.type(reasonField(), "Tout");
    await userEvent.click(submit());
    rerender(<RefundRequestModal paymentId={7} status="succeeded" refundable={0} />);
    expect(trigger()).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Remboursement demandé");
  });

  it("affiche les erreurs par champ de l'API sous les champs", async () => {
    post.mockResolvedValue(
      fail(400, {
        code: "VALIDATION_ERROR",
        message: "Certaines valeurs sont invalides.",
        fields: { amount: [{ code: "invalid", message: "Un nombre entier est attendu." }], reason: [{ code: "blank", message: "Ce champ est obligatoire." }] },
      }),
    );
    await open();
    await userEvent.type(reasonField(), "Doublon");
    await userEvent.click(submit());
    expect(screen.getByText("Un nombre entier est attendu.")).toBeInTheDocument();
    expect(screen.getByText("Ce champ est obligatoire.")).toBeInTheDocument();
    expect(amountField()).toBeInvalid();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("affiche l'état qui a changé (409) dans la modale", async () => {
    post.mockResolvedValue(fail(409, { code: "VALIDATION_ERROR", message: "Montant remboursable : 0 FCFA au plus." }));
    await open();
    await userEvent.type(reasonField(), "Doublon");
    await userEvent.click(submit());
    expect(within(screen.getByRole("dialog")).getByRole("alert")).toHaveTextContent("Montant remboursable : 0 FCFA au plus.");
  });

  it("se replie sur le texte de l'écran sans message de l'API", async () => {
    post.mockResolvedValue(fail(500, { code: "SERVER_ERROR", message: "" }));
    await open();
    await userEvent.type(reasonField(), "Doublon");
    await userEvent.click(submit());
    expect(within(screen.getByRole("dialog")).getByRole("alert")).toHaveTextContent("Une erreur est survenue de notre côté");
  });

  it("annonce un réseau injoignable", async () => {
    post.mockRejectedValue(new Error("réseau"));
    await open();
    await userEvent.type(reasonField(), "Doublon");
    await userEvent.click(submit());
    expect(within(screen.getByRole("dialog")).getByRole("alert")).toHaveTextContent("Le serveur est injoignable");
  });

  it("session expirée : rafraîchit pour passer par la connexion", async () => {
    post.mockResolvedValue(fail(401, { code: "NOT_AUTHENTICATED", message: "" }));
    await open();
    await userEvent.type(reasonField(), "Doublon");
    await userEvent.click(submit());
    expect(refresh).toHaveBeenCalled();
  });

  it("se ferme par Échap, par « Annuler » et par clic extérieur sans appeler l'API", async () => {
    await open();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await userEvent.click(trigger() as HTMLElement);
    await userEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await userEvent.click(trigger() as HTMLElement);
    await userEvent.pointer({ keys: "[MouseLeft]", target: screen.getByRole("dialog").parentElement as HTMLElement });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it("repart d'une saisie vierge à chaque ouverture", async () => {
    await open();
    await userEvent.type(reasonField(), "Brouillon");
    await userEvent.keyboard("{Escape}");
    await userEvent.click(trigger() as HTMLElement);
    expect(reasonField()).toHaveValue("");
    expect(amountField()).toHaveValue("34000");
  });
});
