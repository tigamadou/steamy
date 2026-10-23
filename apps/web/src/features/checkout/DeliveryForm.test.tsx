import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { KIT } from "@/test/api-fixtures";

const router = { push: vi.fn(), replace: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));
const countries = { status: "ready", retry: vi.fn(), items: [{ id: 1, code: "BJ", label: "Bénin", dialCode: "229", phoneRegex: "^01[0-9]{8}$" }] };
vi.mock("@/lib/use-referential", () => ({ useReferential: () => countries }));
const getZones = vi.fn();
const createKitOrder = vi.fn();
const getOrder = vi.fn();
vi.mock("./api", () => ({ getZones, createKitOrder, getOrder }));

const { DeliveryForm } = await import("./DeliveryForm");
const { readCheckout, readOrderToken, saveOrderToken, updateCheckout } = await import("./checkout-storage");

const ZONES = [
  { id: 1, country: "BJ", name: "Cotonou et Abomey-Calavi", fee: 1000, delayLabel: "24 à 48 h" },
  { id: 2, country: "BJ", name: "Porto-Novo", fee: 1500, delayLabel: "2 à 3 jours" },
];
const GUEST = { firstName: "Awa", lastName: "Test", phone: "+2290190000002", phoneCountry: "BJ", phoneNational: "0190000002" };
const CART = { status: "ready", shopper: "guest", lines: [{ kit: KIT, quantity: 2, total: 70000 }], count: 2, subtotal: 70000, taxes: [], total: 70000, dropped: 0 } as const;
const failure = (code: string, fields: Record<string, string> = {}) => ({ ok: false, code, message: "", fields });

async function fill() {
  await userEvent.selectOptions(screen.getByRole("combobox", { name: /^Pays/ }), "BJ");
  await waitFor(() => expect(screen.getByRole("combobox", { name: /zone de livraison/ })).toBeEnabled());
  await userEvent.selectOptions(screen.getByRole("combobox", { name: /zone de livraison/ }), "2");
  await userEvent.type(screen.getByRole("textbox", { name: /^Quartier/ }), "Ouando");
  await userEvent.type(screen.getByRole("textbox", { name: /^Rue/ }), "Près du marché");
}

beforeEach(() => {
  router.push.mockReset();
  router.replace.mockReset();
  getZones.mockReset();
  createKitOrder.mockReset();
  getOrder.mockReset();
  getZones.mockResolvedValue({ ok: true, data: ZONES });
  updateCheckout({ guest: GUEST });
});
afterEach(() => window.sessionStorage.clear());

describe("WK05 · livraison", () => {
  it("frais et délai lus dans la zone choisie, commande créée sans prix, jeton gardé", async () => {
    createKitOrder.mockResolvedValue({ ok: true, data: { reference: "KT-1", guestToken: "secret" } });
    render(<DeliveryForm cart={CART as never} />);
    await fill();
    expect(getZones).toHaveBeenCalledWith("BJ");
    expect(screen.getByText(/Livraison Porto-Novo : 1\s500 F CFA HT · délai annoncé 2 à 3 jours/)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Téléphone du destinataire/ })).toHaveValue("0190000002");
    await userEvent.click(screen.getByRole("button", { name: "Continuer vers le paiement" }));
    expect(createKitOrder).toHaveBeenCalledWith({
      items: [{ kitSlug: "steamy-bot-v1", quantity: 2 }],
      guest: { firstName: "Awa", lastName: "Test", phone: "+2290190000002" },
      deliveryAddress: {
        zoneId: 2,
        recipientName: "Awa Test",
        phone: "+2290190000002",
        city: "Porto-Novo",
        district: "Ouando",
        addressLine: "Près du marché",
      },
    });
    expect(router.push).toHaveBeenCalledWith("/boutique/commande/paiement");
    expect(readOrderToken("KT-1")).toBe("secret");
    expect(readCheckout()).toMatchObject({
      reference: "KT-1",
      delivery: { country: "BJ", zoneId: 2, district: "Ouando", addressLine: "Près du marché" },
    });
    expect(readCheckout().orderKey).toContain('"kitSlug":"steamy-bot-v1"');
    expect(getOrder).not.toHaveBeenCalled();
  });

  it("retour à WK05 sans changement : la commande en attente est reprise, sans nouvelle réservation", async () => {
    const later = new Date(Date.now() + 15 * 60_000).toISOString();
    const earlier = new Date(Date.now() - 60_000).toISOString();
    createKitOrder.mockResolvedValue({ ok: true, data: { reference: "KT-1", guestToken: "secret" } });
    const { unmount } = render(<DeliveryForm cart={CART as never} />);
    await fill();
    await userEvent.click(screen.getByRole("button", { name: "Continuer vers le paiement" }));
    expect(createKitOrder).toHaveBeenCalledTimes(1);
    unmount();

    const again = async () => {
      router.push.mockReset();
      const view = render(<DeliveryForm cart={CART as never} />);
      await waitFor(() => expect(screen.getByRole("combobox", { name: /zone de livraison/ })).toHaveValue("2"));
      await userEvent.click(screen.getByRole("button", { name: "Continuer vers le paiement" }));
      await waitFor(() => expect(router.push).toHaveBeenCalledWith("/boutique/commande/paiement"));
      view.unmount();
    };

    // Commande toujours à payer : reprise, lue avec son jeton
    getOrder.mockResolvedValueOnce({ ok: true, data: { status: "pending", expiresAt: later } });
    await again();
    expect(getOrder).toHaveBeenCalledWith("KT-1", "secret");
    expect(createKitOrder).toHaveBeenCalledTimes(1);

    // Expirée, annulée ou illisible : nouvelle commande
    getOrder.mockResolvedValueOnce({ ok: true, data: { status: "pending", expiresAt: earlier } });
    await again();
    getOrder.mockResolvedValueOnce({ ok: true, data: { status: "cancelled", expiresAt: later } });
    await again();
    getOrder.mockResolvedValueOnce({ ok: false, code: "NETWORK_UNAVAILABLE", message: "", fields: {} });
    await again();
    expect(createKitOrder).toHaveBeenCalledTimes(4);

    // Jeton perdu : nouvelle commande, sans lecture
    getOrder.mockClear();
    updateCheckout({ reference: "KT-2" });
    await again();
    expect(getOrder).not.toHaveBeenCalled();
    expect(createKitOrder).toHaveBeenCalledTimes(5);
  });

  it("panier, coordonnées ou adresse changés : nouvelle commande", async () => {
    saveOrderToken("KT-9", "secret");
    updateCheckout({ reference: "KT-9", orderKey: "{}" });
    createKitOrder.mockResolvedValue({ ok: true, data: { reference: "KT-10", guestToken: "autre" } });
    render(<DeliveryForm cart={CART as never} />);
    await fill();
    await userEvent.click(screen.getByRole("button", { name: "Continuer vers le paiement" }));
    await waitFor(() => expect(createKitOrder).toHaveBeenCalledTimes(1));
    expect(getOrder).not.toHaveBeenCalled();
    expect(readCheckout().reference).toBe("KT-10");
  });

  it("champs obligatoires ; changer de pays vide la zone", async () => {
    render(<DeliveryForm cart={CART as never} />);
    await userEvent.clear(screen.getByRole("textbox", { name: /Téléphone du destinataire/ }));
    await userEvent.click(screen.getByRole("button", { name: "Continuer vers le paiement" }));
    expect(await screen.findAllByText("Choisissez votre pays.")).not.toHaveLength(0);
    expect(screen.getAllByText("Choisissez votre zone de livraison.")).not.toHaveLength(0);
    expect(screen.getAllByText("Indiquez votre quartier.")).not.toHaveLength(0);
    expect(screen.getAllByText("Indiquez une rue ou un repère.")).not.toHaveLength(0);
    expect(screen.getAllByText("Indiquez un numéro de téléphone valide.")).not.toHaveLength(0);
    expect(createKitOrder).not.toHaveBeenCalled();
  });

  it("stock épuisé, zone refusée, autre erreur", async () => {
    render(<DeliveryForm cart={CART as never} />);
    await fill();
    const submit = screen.getByRole("button", { name: "Continuer vers le paiement" });
    createKitOrder.mockResolvedValueOnce(failure("OUT_OF_STOCK"));
    await userEvent.click(submit);
    expect(await screen.findByRole("alert")).toHaveTextContent("vient d'être épuisé");
    expect(screen.getByRole("link", { name: "Revenir au panier" })).toHaveAttribute("href", "/boutique/panier");

    createKitOrder.mockResolvedValueOnce(failure("VALIDATION_ERROR", { deliveryAddress: "Zone non desservie." }));
    await userEvent.click(submit);
    expect(await screen.findAllByText("Zone non desservie.")).not.toHaveLength(0);

    createKitOrder.mockResolvedValueOnce(failure("THROTTLED"));
    await userEvent.click(submit);
    expect(await screen.findAllByText(/Trop de tentatives. Réessayez/)).not.toHaveLength(0);
    expect(router.push).not.toHaveBeenCalled();

    // Délai annoncé par l'API : envoi bloqué avec compte à rebours
    createKitOrder.mockResolvedValueOnce({ ...failure("THROTTLED"), retryAfter: 45 });
    await userEvent.click(submit);
    expect(await screen.findByRole("button", { name: "Réessayer dans 0:45" })).toBeDisabled();
  });

  it("adresse reprise au retour ; zones en panne : « Réessayer »", async () => {
    updateCheckout({ delivery: { country: "BJ", zoneId: 1, district: "Akpakpa", addressLine: "Rue 12" } });
    getZones.mockResolvedValueOnce(failure("SERVER_ERROR"));
    render(<DeliveryForm cart={{ ...CART, count: 1 } as never} />);
    expect(screen.getByRole("textbox", { name: /^Quartier/ })).toHaveValue("Akpakpa");
    expect(screen.getByText(/1 article : le total/)).toBeInTheDocument();
    await userEvent.click(await screen.findByRole("button", { name: "Réessayer" }));
    expect(await screen.findByText(/Livraison Cotonou et Abomey-Calavi : 1\s000 F CFA/)).toBeInTheDocument();
    // Changement de pays : la zone repart de zéro
    await userEvent.selectOptions(screen.getByRole("combobox", { name: /^Pays/ }), "");
    expect(screen.queryByText(/Livraison Cotonou/)).not.toBeInTheDocument();
  });

  it("sans coordonnées : retour à WK04", async () => {
    window.sessionStorage.clear();
    const { container } = render(<DeliveryForm cart={CART as never} />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/boutique/commande/coordonnees"));
    expect(container).toBeEmptyDOMElement();
  });

  it("démonté avant les zones : rien n'est mis à jour", async () => {
    let resolve!: (value: unknown) => void;
    getZones.mockReturnValue(new Promise((r) => (resolve = r)));
    updateCheckout({ delivery: { country: "BJ", zoneId: 1, district: "A", addressLine: "R" } });
    const { unmount } = render(<DeliveryForm cart={CART as never} />);
    unmount();
    resolve({ ok: true, data: ZONES });
    await Promise.resolve();
  });
});
