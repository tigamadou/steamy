import type { Schemas } from "@steamy/api-client";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const router = { push: vi.fn(), replace: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));
const countries = {
  status: "ready" as string,
  retry: vi.fn(),
  items: [{ id: 1, code: "BJ", label: "Bénin", dialCode: "229" }] as unknown[] | undefined,
};
vi.mock("@/lib/use-referential", () => ({ useReferential: () => countries }));
const getOrder = vi.fn();
const payOrder = vi.fn();
vi.mock("./api", () => ({ getOrder, payOrder }));

type FormProps = { amount: number; defaultCountry?: string; onSubmit: (v: unknown) => Promise<unknown> };
type PanelProps = {
  payment: Schemas["Payment"];
  guestToken?: string;
  ordersHref: string;
  success: { message: string; action: { href: string } };
  onChangeNumber: () => void;
  onRetry: () => void;
  retrying?: boolean;
  onSettled: (p: Schemas["Payment"]) => void;
};
let panel: PanelProps;
const VALUES = { country: "BJ", network: "mtn", msisdn: "+2290190000002" };
vi.mock("@/components/ds", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  PaymentForm: ({ amount, defaultCountry, onSubmit }: FormProps) => (
    <button type="button" onClick={() => void onSubmit(VALUES)}>{`Payer ${amount} (${defaultCountry})`}</button>
  ),
  PaymentStatusPanel: (props: PanelProps) => {
    panel = props;
    return (
      <>
        <p>{`paiement ${props.payment.status}`}</p>
        <button type="button" onClick={props.onRetry} aria-busy={props.retrying}>
          Réessayer le paiement
        </button>
      </>
    );
  },
}));

const { PaymentStep } = await import("./PaymentStep");
const { readCheckout, saveOrderToken, updateCheckout } = await import("./checkout-storage");
const { readGuestCart, writeGuestCart } = await import("@/features/shop/guest-cart");

const ORDER = {
  reference: "KT-1",
  status: "pending",
  subtotal: 70000,
  shippingFee: 1500,
  total: 71500,
  items: [{ id: 1, title: "Bot", quantity: 2, total: 70000 }],
  deliveryZone: { id: 2, name: "Porto-Novo", delayLabel: "2 à 3 jours" },
  expiresAt: new Date(Date.now() + 20 * 60_000).toISOString(),
};
const PAYMENT = { id: 9, status: "pending", msisdnMasked: "01 •• •• 02" } as Schemas["Payment"];
const failure = (code: string) => ({ ok: false, code, message: "", fields: {} });

beforeEach(() => {
  router.push.mockReset();
  router.replace.mockReset();
  getOrder.mockReset();
  payOrder.mockReset();
  countries.status = "ready";
  countries.items = [{ id: 1, code: "BJ", label: "Bénin", dialCode: "229" }];
  updateCheckout({ reference: "KT-1", delivery: { country: "BJ", zoneId: 2, district: "A", addressLine: "R" } });
  saveOrderToken("KT-1", "secret");
});
afterEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
});

describe("WK06 / WK09 · paiement", () => {
  it("total serveur, heure limite, paiement puis attente ; succès : panier vidé et suivi", async () => {
    writeGuestCart([{ kitSlug: "bot", quantity: 2 }]);
    getOrder.mockResolvedValue({ ok: true, data: ORDER });
    payOrder.mockResolvedValue({ ok: true, data: PAYMENT });
    render(<PaymentStep />);
    expect(screen.getByRole("status", { name: "Chargement de votre commande…" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Total à payer · 2 articles + livraison" })).toBeInTheDocument();
    expect(getOrder).toHaveBeenCalledWith("KT-1", "secret");
    expect(screen.getByText(/71\s500 F CFA/)).toBeInTheDocument();
    expect(screen.getByText("Livraison (Porto-Novo)")).toBeInTheDocument();
    expect(screen.getByText(/réservés jusqu'à \d{2}:\d{2}/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Payer 71500 (BJ)" }));
    expect(payOrder).toHaveBeenCalledWith("KT-1", "secret", VALUES);
    expect(await screen.findByText("paiement pending")).toBeInTheDocument();
    expect(panel.guestToken).toBe("secret");
    expect(panel.ordersHref).toBe("/boutique/commandes/KT-1");
    expect(panel.success.action.href).toBe("/boutique/commandes/KT-1");
    getOrder.mockResolvedValue({ ok: true, data: { ...ORDER, status: "paid" } });
    panel.onSettled({ ...PAYMENT, status: "succeeded" });
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/boutique/commandes/KT-1"));
    expect(readGuestCart()).toEqual([]);
    expect(readCheckout()).toEqual({});
  });

  it("succès mais commande remboursée (paiement après le délai, C17) : panier et tunnel gardés, suivi", async () => {
    writeGuestCart([{ kitSlug: "bot", quantity: 2 }]);
    getOrder.mockResolvedValueOnce({ ok: true, data: ORDER });
    getOrder.mockResolvedValueOnce({ ok: true, data: { ...ORDER, status: "refunded" } });
    payOrder.mockResolvedValue({ ok: true, data: PAYMENT });
    render(<PaymentStep />);
    await userEvent.click(await screen.findByRole("button", { name: /^Payer/ }));
    await screen.findByText("paiement pending");
    panel.onSettled({ ...PAYMENT, status: "succeeded" });
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/boutique/commandes/KT-1"));
    expect(readGuestCart()).toEqual([{ kitSlug: "bot", quantity: 2 }]);
    expect(readCheckout().reference).toBe("KT-1");
  });

  it("WK09 : échec, panier conservé, « Réessayer » rejoue les mêmes valeurs, « Changer de numéro »", async () => {
    writeGuestCart([{ kitSlug: "bot", quantity: 2 }]);
    getOrder.mockResolvedValue({ ok: true, data: ORDER });
    payOrder.mockResolvedValue({ ok: true, data: { ...PAYMENT, status: "failed" } });
    render(<PaymentStep />);
    await userEvent.click(await screen.findByRole("button", { name: /^Payer/ }));
    expect(await screen.findByText("paiement failed")).toBeInTheDocument();
    panel.onSettled({ ...PAYMENT, status: "failed" });
    expect(await screen.findByText(/Votre panier est conservé/)).toBeInTheDocument();
    expect(readGuestCart()).toEqual([{ kitSlug: "bot", quantity: 2 }]);
    panel.onRetry();
    await waitFor(() => expect(payOrder).toHaveBeenCalledTimes(2));
    expect(payOrder).toHaveBeenLastCalledWith("KT-1", "secret", VALUES);
    await screen.findByText("paiement failed");
    panel.onChangeNumber();
    expect(await screen.findByRole("button", { name: /^Payer/ })).toBeInTheDocument();
  });

  it("ORDER_EXPIRED au paiement : retour au panier ; ORDER_ALREADY_PAID : suivi ; autre erreur : formulaire", async () => {
    getOrder.mockResolvedValue({ ok: true, data: ORDER });
    payOrder.mockResolvedValueOnce(failure("NETWORK_UNAVAILABLE"));
    payOrder.mockResolvedValueOnce(failure("ORDER_ALREADY_PAID"));
    payOrder.mockResolvedValueOnce(failure("ORDER_EXPIRED"));
    render(<PaymentStep />);
    const pay = await screen.findByRole("button", { name: /^Payer/ });
    await userEvent.click(pay);
    await waitFor(() => expect(payOrder).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("button", { name: /^Payer/ })).toBeInTheDocument();
    await userEvent.click(pay);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/boutique/commandes/KT-1"));
    await userEvent.click(pay);
    expect(await screen.findByText(/délai de réservation est dépassé/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retour au panier" })).toHaveAttribute("href", "/boutique/panier");
  });

  it("double clic sur « Réessayer » : un seul envoi, bouton occupé, erreur de l'essai avec son délai", async () => {
    getOrder.mockResolvedValue({ ok: true, data: ORDER });
    payOrder.mockResolvedValueOnce({ ok: true, data: { ...PAYMENT, status: "failed" } });
    let resolve!: (value: unknown) => void;
    payOrder.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    render(<PaymentStep />);
    await userEvent.click(await screen.findByRole("button", { name: /^Payer/ }));
    const retry = await screen.findByRole("button", { name: "Réessayer le paiement" });
    await userEvent.dblClick(retry);
    expect(payOrder).toHaveBeenCalledTimes(2);
    expect(retry).toHaveAttribute("aria-busy", "true");
    resolve({ ok: false, code: "THROTTLED", message: "", fields: {}, retryAfter: 30 });
    expect(await screen.findByRole("alert")).toHaveTextContent("Réessayez dans 30 secondes");
    expect(retry).toHaveAttribute("aria-busy", "false");
  });

  it("échéance passée mais commande encore en attente : le statut de l'API fait foi", async () => {
    getOrder.mockResolvedValueOnce({ ok: true, data: { ...ORDER, expiresAt: "2020-01-01T00:00:00Z" } });
    render(<PaymentStep />);
    expect(await screen.findByRole("button", { name: /^Payer/ })).toBeInTheDocument();
  });

  it("commande annulée, payée ou remboursée à l'arrivée", async () => {
    getOrder.mockResolvedValueOnce({ ok: true, data: { ...ORDER, status: "refunded" } });
    const first = render(<PaymentStep />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/boutique/commandes/KT-1"));
    first.unmount();
    router.replace.mockReset();
    getOrder.mockResolvedValueOnce({ ok: true, data: { ...ORDER, status: "cancelled" } });
    const second = render(<PaymentStep />);
    expect(await screen.findByText(/délai de réservation est dépassé/)).toBeInTheDocument();
    second.unmount();
    getOrder.mockResolvedValueOnce({ ok: true, data: { ...ORDER, status: "paid" } });
    render(<PaymentStep />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/boutique/commandes/KT-1"));
  });

  it("commande introuvable ; erreur de lecture avec « Réessayer »", async () => {
    getOrder.mockResolvedValueOnce(failure("NOT_FOUND"));
    const first = render(<PaymentStep />);
    expect(await screen.findByText(/Cette commande est introuvable/)).toBeInTheDocument();
    first.unmount();
    getOrder.mockResolvedValueOnce(failure("SERVER_ERROR"));
    getOrder.mockResolvedValueOnce({ ok: true, data: ORDER });
    render(<PaymentStep />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Réessayez dans quelques instants");
    await userEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(await screen.findByRole("button", { name: /^Payer/ })).toBeInTheDocument();
  });

  it("pays en chargement puis en erreur ; un seul article", async () => {
    getOrder.mockResolvedValue({ ok: true, data: { ...ORDER, items: [{ id: 1, title: "Bot", quantity: 1, total: 1 }], deliveryZone: null } });
    countries.items = undefined;
    countries.status = "loading";
    const { rerender } = render(<PaymentStep />);
    expect(await screen.findByText("Total à payer · 1 article + livraison")).toBeInTheDocument();
    expect(screen.getByText("Livraison")).toBeInTheDocument();
    expect(screen.getByText("Chargement du formulaire de paiement…")).toBeInTheDocument();
    countries.status = "error";
    rerender(<PaymentStep />);
    await userEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(countries.retry).toHaveBeenCalled();
  });

  it("sans commande dans l'onglet : retour à la livraison ; démonté avant la réponse", async () => {
    window.sessionStorage.clear();
    const first = render(<PaymentStep />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/boutique/commande/livraison"));
    expect(getOrder).not.toHaveBeenCalled();
    first.unmount();
    updateCheckout({ reference: "KT-1" });
    let resolve!: (value: unknown) => void;
    getOrder.mockReturnValue(new Promise((r) => (resolve = r)));
    const { unmount } = render(<PaymentStep />);
    expect(getOrder).toHaveBeenCalledWith("KT-1", null);
    unmount();
    resolve({ ok: true, data: ORDER });
    await Promise.resolve();
  });
});
