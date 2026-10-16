import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

import type { Payment } from "./PaymentStatusPanel";

const GET = vi.fn();
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ GET }) }));

const { PaymentStatusPanel } = await import("./PaymentStatusPanel");

const PENDING: Payment = {
  id: 41,
  orderReference: "STM-ABCD",
  status: "pending",
  country: "BJ",
  network: "mtn",
  msisdnMasked: "+229 01 •• •• •• 01",
  amount: 18000,
  currency: "XOF",
  failureCode: "",
  failureReason: "",
  createdAt: "2026-10-16T10:00:00Z",
  confirmedAt: null,
};

function ok(payment: Payment) {
  return { data: payment, response: new Response(null, { status: 200 }) };
}

const props = {
  ordersHref: "/parent/commandes",
  success: {
    message: <p>Le parcours Capteurs est débloqué pour Léa.</p>,
    action: { label: "Retour à mon espace", href: "/parent" },
  },
  onChangeNumber: vi.fn(),
  onRetry: vi.fn(),
};

beforeEach(() => {
  GET.mockReset();
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("PaymentStatusPanel", () => {
  it("WA04 attente puis WA05 succès : interroge le paiement jusqu'à son issue", async () => {
    vi.useFakeTimers();
    const onSettled = vi.fn();
    GET.mockResolvedValueOnce(ok(PENDING)).mockResolvedValueOnce(ok({ ...PENDING, status: "succeeded" }));
    render(<PaymentStatusPanel {...props} payment={PENDING} onSettled={onSettled} register="tu" />);
    expect(screen.getByRole("heading", { level: 2, name: "On confirme ton paiement…" })).toBeInTheDocument();
    expect(screen.getByText("Demande envoyée au +229 01 •• •• •• 01")).toBeInTheDocument();
    expect(screen.getByText(/Valide la demande sur ton téléphone/)).toBeInTheDocument();

    await act(() => vi.advanceTimersByTimeAsync(3_000));
    expect(GET).toHaveBeenCalledWith("/api/payments/payments/{id}/", { params: { path: { id: 41 }, header: undefined } });
    expect(screen.getByRole("heading", { name: "On confirme ton paiement…" })).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(3_000));
    expect(screen.getByRole("heading", { level: 2, name: "Paiement réussi !" })).toBeInTheDocument();
    expect(screen.getByText("Le parcours Capteurs est débloqué pour Léa.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retour à mon espace" })).toHaveAttribute("href", "/parent");
    expect(onSettled).toHaveBeenCalledWith(expect.objectContaining({ status: "succeeded" }));
    await act(() => vi.advanceTimersByTimeAsync(10_000));
    expect(GET).toHaveBeenCalledTimes(2);
  });

  it("toujours en attente après le délai : lien vers les commandes, jeton invité transmis (vouvoiement)", async () => {
    vi.useFakeTimers();
    GET.mockRejectedValue(new Error("réseau"));
    render(<PaymentStatusPanel {...props} payment={{ ...PENDING, status: "initiated" }} guestToken="jeton" />);
    expect(screen.getByRole("heading", { name: "On confirme votre paiement…" })).toBeInTheDocument();
    expect(screen.queryByText(/toujours en attente/)).not.toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(120_000));
    expect(GET).toHaveBeenCalledWith("/api/payments/payments/{id}/", {
      params: { path: { id: 41 }, header: { "X-Guest-Token": "jeton" } },
    });
    expect(screen.getByText(/Le paiement est toujours en attente de validation. Vous pouvez quitter/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir mes commandes" })).toHaveAttribute("href", "/parent/commandes");
  });

  it("WA07 échec : raison du prestataire, « Changer de numéro » et « Réessayer le paiement »", async () => {
    const user = userEvent.setup();
    const onSettled = vi.fn();
    const failed = { ...PENDING, status: "failed" as const, failureReason: "Solde insuffisant." };
    const { container, rerender } = render(<PaymentStatusPanel {...props} payment={failed} onSettled={onSettled} />);
    expect(screen.getByRole("heading", { level: 2, name: "Paiement échoué" })).toBeInTheDocument();
    expect(screen.getByText(/Aucun montant n'a été débité/)).toBeInTheDocument();
    expect(screen.getByText("Raison : Solde insuffisant.")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
    await user.click(screen.getByRole("button", { name: "Changer de numéro" }));
    await user.click(screen.getByRole("button", { name: "Réessayer le paiement" }));
    expect(props.onChangeNumber).toHaveBeenCalled();
    expect(props.onRetry).toHaveBeenCalled();
    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(GET).not.toHaveBeenCalled();
    rerender(<PaymentStatusPanel {...props} key="sans-raison" payment={{ ...failed, failureReason: "" }} />);
    expect(screen.queryByText(/Raison/)).not.toBeInTheDocument();
  });
});
