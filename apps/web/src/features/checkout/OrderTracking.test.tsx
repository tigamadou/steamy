import type { Schemas } from "@steamy/api-client";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const getOrder = vi.fn();
const getInvoice = vi.fn();
vi.mock("./api", () => ({ getOrder, getInvoice }));

const { OrderTracking } = await import("./OrderTracking");
const { readOrderToken, saveOrderToken } = await import("./checkout-storage");

const ORDER: Schemas["Order"] = {
  reference: "KT-7042",
  kind: "kit",
  status: "paid",
  shippingStatus: "preparing",
  subtotal: 70000,
  shippingFee: 1500,
  taxes: [],
  total: 71500,
  currency: "XOF",
  items: [
    { id: 1, title: "Steamy Bot v1", courseSlug: "", kitSlug: "steamy-bot-v1", eventSlug: "", unitPrice: 35000, quantity: 2, total: 70000 },
  ],
  beneficiary: null,
  deliveryZone: { id: 2, name: "Porto-Novo", delayLabel: "2 à 3 jours" },
  expiresAt: "2026-10-16T14:02:00Z",
  paidAt: "2026-10-16T13:40:00Z",
  createdAt: "2026-10-16T13:32:00Z",
  deliveryAddress: null,
  kitCodes: [],
  invoice: { number: "F-1", pdfStatus: "ready" },
};
const failure = (code: string) => ({ ok: false, code, message: "", fields: {} });

beforeEach(() => {
  getOrder.mockReset();
  getInvoice.mockReset();
  window.history.replaceState(null, "", "/boutique/commandes/KT-7042");
});
afterEach(() => window.sessionStorage.clear());

describe("WK07 · suivi de commande", () => {
  it("lien SMS : jeton lu dans le fragment, gardé dans l'onglet puis retiré de l'adresse", async () => {
    window.history.replaceState(null, "", "/boutique/commandes/KT-7042#jeton=abc_DEF-1");
    getOrder.mockResolvedValue({ ok: true, data: ORDER });
    render(<OrderTracking reference="KT-7042" />);
    expect(screen.getByRole("status", { name: "Chargement de la commande…" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 1, name: "Merci, c'est commandé !" })).toBeInTheDocument();
    expect(getOrder).toHaveBeenCalledWith("KT-7042", "abc_DEF-1");
    expect(window.location.hash).toBe("");
    expect(readOrderToken("KT-7042")).toBe("abc_DEF-1");
  });

  it("commande payée : timeline, Kit Code, récapitulatif serveur, reçu téléchargé", async () => {
    saveOrderToken("KT-7042", "secret");
    getOrder.mockResolvedValue({ ok: true, data: ORDER });
    const createObjectURL = vi.fn(() => "blob:recu");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL, revokeObjectURL }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const { container } = render(<OrderTracking reference="KT-7042" />);
    const timeline = await screen.findByRole("list", { name: "Suivi de livraison" });
    expect(within(timeline).getAllByRole("listitem")[1]).toHaveAttribute("aria-current", "step");
    expect(screen.getByText("Délai annoncé : 2 à 3 jours")).toBeInTheDocument();
    expect(screen.getByText(/Le Kit Code est imprimé sur la notice/)).toBeInTheDocument();
    expect(screen.getByText("Steamy Bot v1 × 2")).toBeInTheDocument();
    expect(screen.getByText("Livraison (Porto-Novo)")).toBeInTheDocument();
    expect(screen.getByText(/71\s500 F CFA/)).toBeInTheDocument();
    expect(getOrder).toHaveBeenCalledWith("KT-7042", "secret");
    expect(await axe(container)).toHaveNoViolations();

    getInvoice.mockResolvedValueOnce(failure("PDF_NOT_READY"));
    await userEvent.click(screen.getByRole("button", { name: "Télécharger le reçu" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("en cours de préparation");
    getInvoice.mockResolvedValueOnce(failure("SERVER_ERROR"));
    await userEvent.click(screen.getByRole("button", { name: "Télécharger le reçu" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Réessayez dans quelques instants");
    getInvoice.mockResolvedValueOnce({ ok: true, data: new Blob(["%PDF"]) });
    await userEvent.click(screen.getByRole("button", { name: "Télécharger le reçu" }));
    expect(getInvoice).toHaveBeenLastCalledWith("KT-7042", "secret");
    expect(click).toHaveBeenCalled();
    await waitFor(() => expect(revokeObjectURL).toHaveBeenCalledWith("blob:recu"), { timeout: 2_000 });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retour à la boutique" })).toHaveAttribute("href", "/boutique");
    click.mockRestore();
    vi.unstubAllGlobals();
  });

  it("commande en attente ou annulée : pas de timeline ni de reçu ; sans zone ni facture", async () => {
    getOrder.mockResolvedValueOnce({ ok: true, data: { ...ORDER, status: "pending", invoice: null, deliveryZone: null } });
    const { unmount } = render(<OrderTracking reference="KT-7042" />);
    expect(await screen.findByRole("heading", { name: "Paiement en attente" })).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Suivi de livraison" })).not.toBeInTheDocument();
    expect(screen.getByText("Livraison")).toBeInTheDocument();
    unmount();
    getOrder.mockResolvedValueOnce({ ok: true, data: { ...ORDER, status: "cancelled" } });
    const cancelled = render(<OrderTracking reference="KT-7042" />);
    expect(await screen.findByRole("heading", { name: "Commande annulée" })).toBeInTheDocument();
    expect(screen.getByText(/n'a pas été payée à temps/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Télécharger le reçu" })).not.toBeInTheDocument();
    expect(cancelled.container.querySelector(".bg-success-50")).toBeNull();
  });

  it("commande remboursée : message neutre (motif non exposé par l'API), ni suivi ni reçu", async () => {
    getOrder.mockResolvedValueOnce({ ok: true, data: { ...ORDER, status: "refunded" } });
    render(<OrderTracking reference="KT-7042" />);
    expect(await screen.findByRole("heading", { level: 1, name: "Commande remboursée" })).toBeInTheDocument();
    expect(screen.getByText(/elle vous a été remboursée\./)).toBeInTheDocument();
    expect(screen.queryByText(/après le délai/)).not.toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Suivi de livraison" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Télécharger le reçu" })).not.toBeInTheDocument();
  });

  it("introuvable (jeton absent ou faux) ; autre erreur avec « Réessayer »", async () => {
    getOrder.mockResolvedValueOnce(failure("NOT_FOUND"));
    const { unmount } = render(<OrderTracking reference="KT-7042" />);
    expect(await screen.findByRole("heading", { name: "Commande introuvable" })).toBeInTheDocument();
    expect(getOrder).toHaveBeenCalledWith("KT-7042", null);
    unmount();
    getOrder.mockResolvedValueOnce(failure("NETWORK_UNAVAILABLE"));
    getOrder.mockResolvedValueOnce({ ok: true, data: ORDER });
    render(<OrderTracking reference="KT-7042" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Vérifiez votre connexion");
    await userEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(await screen.findByRole("heading", { name: "Merci, c'est commandé !" })).toBeInTheDocument();
  });

  it("démonté avant la réponse : rien n'est mis à jour", async () => {
    let resolve!: (value: unknown) => void;
    getOrder.mockReturnValue(new Promise((r) => (resolve = r)));
    const { unmount } = render(<OrderTracking reference="KT-7042" />);
    unmount();
    resolve({ ok: true, data: ORDER });
    await Promise.resolve();
  });
});
