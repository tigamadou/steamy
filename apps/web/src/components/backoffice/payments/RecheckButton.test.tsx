import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

import { paymentDetail } from "./fixtures";

const refresh = vi.fn();
const post = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ POST: post }) }));

const { RecheckButton } = await import("./RecheckButton");

const ok = (data: unknown) => ({ data, response: new Response(null, { status: 200 }) });
const fail = (status: number, error: object) => ({ error, response: new Response(null, { status }) });
const button = () => screen.queryByRole("button", { name: "Revérifier chez FedaPay" });

describe("RecheckButton", () => {
  beforeEach(() => {
    refresh.mockReset();
    post.mockReset();
  });

  it.each(["pending", "failed", "initiated"])("est proposé pour un paiement %s", async (status) => {
    const { container } = render(<RecheckButton paymentId={4} status={status} />);
    expect(button()).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("n'est pas proposé pour un paiement réussi", () => {
    render(<RecheckButton paymentId={4} status="succeeded" />);
    expect(button()).not.toBeInTheDocument();
  });

  it("revérifie, rafraîchit la page et annonce le nouveau statut", async () => {
    post.mockResolvedValue(ok(paymentDetail({ status: "succeeded" })));
    render(<RecheckButton paymentId={4} status="pending" />);
    await userEvent.click(button() as HTMLElement);
    expect(post).toHaveBeenCalledWith("/api/backoffice/payments/{id}/recheck/", { params: { path: { id: 4 } } });
    expect(refresh).toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Paiement revérifié : statut Réussi.");
  });

  it("garde le message quand le paiement réglé n'a plus de bouton", async () => {
    post.mockResolvedValue(ok(paymentDetail({ status: "succeeded" })));
    const { rerender } = render(<RecheckButton paymentId={4} status="pending" />);
    await userEvent.click(button() as HTMLElement);
    rerender(<RecheckButton paymentId={4} status="succeeded" />);
    expect(button()).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("statut Réussi");
  });

  it("annonce un statut inconnu tel quel", async () => {
    post.mockResolvedValue(ok(paymentDetail({ status: "reversed" })));
    render(<RecheckButton paymentId={4} status="pending" />);
    await userEvent.click(button() as HTMLElement);
    expect(screen.getByRole("status")).toHaveTextContent("statut reversed.");
  });

  it("empêche le double envoi pendant l'appel", async () => {
    let finish: (value: unknown) => void = () => {};
    post.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    render(<RecheckButton paymentId={4} status="failed" />);
    await userEvent.click(button() as HTMLElement);
    expect(button()).toBeDisabled();
    await userEvent.click(button() as HTMLElement);
    expect(post).toHaveBeenCalledTimes(1);
    finish(ok(paymentDetail({ status: "failed" })));
    expect(await screen.findByText(/statut Échoué/)).toBeInTheDocument();
  });

  it("affiche le texte de l'API quand le prestataire ne répond pas", async () => {
    post.mockResolvedValue(fail(502, { code: "SERVER_ERROR", message: "Le prestataire de paiement n'a pas répondu : réessayez dans quelques instants." }));
    render(<RecheckButton paymentId={4} status="pending" />);
    await userEvent.click(button() as HTMLElement);
    expect(screen.getByRole("alert")).toHaveTextContent("Le prestataire de paiement n'a pas répondu");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("se replie sur un texte neutre sans message de l'API", async () => {
    post.mockResolvedValue(fail(500, { code: "SERVER_ERROR", message: "" }));
    render(<RecheckButton paymentId={4} status="pending" />);
    await userEvent.click(button() as HTMLElement);
    expect(screen.getByRole("alert")).toHaveTextContent("La vérification a échoué. Réessayez.");
  });

  it("annonce un réseau injoignable", async () => {
    post.mockRejectedValue(new Error("réseau"));
    render(<RecheckButton paymentId={4} status="pending" />);
    await userEvent.click(button() as HTMLElement);
    expect(screen.getByRole("alert")).toHaveTextContent("Le serveur est injoignable");
  });

  it.each([
    [401, { code: "NOT_AUTHENTICATED", message: "" }],
    [403, { code: "OTP_REQUIRED", message: "" }],
  ])("session expirée (%s) : rafraîchit pour passer par la connexion", async (status, error) => {
    post.mockResolvedValue(fail(status, error));
    render(<RecheckButton paymentId={4} status="pending" />);
    await userEvent.click(button() as HTMLElement);
    expect(refresh).toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeEmptyDOMElement();
  });
});
