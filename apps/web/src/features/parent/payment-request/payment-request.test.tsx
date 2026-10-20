import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetReferentials } from "@/lib/use-referential";
import { axe } from "@/test/axe";
import {
  ADDRESS,
  CHILD,
  COUNTRIES,
  KIT_REQUEST,
  NETWORKS,
  order,
  payment,
  paymentRequest,
} from "@/test/payment-request-fixtures";

const GET = vi.fn();
const POST = vi.fn();
const PUT = vi.fn();
const router = { refresh: vi.fn() };
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ GET, POST, PUT }) }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
// Interrogation du statut : une lecture dès que l'attente commence (sans minuterie)
vi.mock("@/lib/use-visible-polling", () => ({
  useVisiblePolling: (poll: () => void, _ms: number, enabled: boolean) => {
    useEffect(() => {
      if (enabled) poll();
    }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps
  },
}));

const { paymentErrorMessage, translated, STATE_BADGES } = await import("./messages");
const { PaymentRequestSummary, amountLabel } = await import("./PaymentRequestSummary");
const { DeclineRequestDialog } = await import("./DeclineRequestDialog");
const { OrderPayment } = await import("./OrderPayment");
const { KitAddressStep } = await import("./KitAddressStep");
const { PaymentRequestFlow } = await import("./PaymentRequestFlow");
const { ClosedRequest } = await import("./ClosedRequest");

const respond = (status: number, data?: unknown) => ({ data, response: new Response(null, { status }) });
const failure = (status: number, code: string, fields?: Record<string, string>, message = "") => ({
  error: {
    code,
    message,
    fields: fields && Object.fromEntries(Object.entries(fields).map(([name, text]) => [name, [{ message: text }]])),
  },
  response: new Response(null, { status }),
});
const fail = (code: string) => ({ ok: false as const, code: code as never, message: "", fields: {} });

/** Référentiels du navigateur : pays, réseaux, zones de livraison, et statut du paiement interrogé. */
function browserGet(paymentStatus: unknown = payment({ status: "succeeded" }), orderStatus = order({ status: "paid" })) {
  GET.mockImplementation(async (path: string) => {
    if (path === "/api/payments/orders/{reference}/") return respond(200, orderStatus);
    if (path === "/api/referentials/countries/") return respond(200, COUNTRIES);
    if (path === "/api/referentials/payment-networks/") return respond(200, NETWORKS);
    if (path === "/api/shop/delivery-zones/") return respond(200, [ADDRESS.zone]);
    return respond(200, paymentStatus);
  });
}

const PREFERRED = { country: "BJ", network: "mtn", phone: "+2290190000001" };
const payButton = () => screen.getByRole("button", { name: /^Payer/ });

beforeEach(() => {
  resetReferentials();
  GET.mockReset();
  POST.mockReset();
  PUT.mockReset();
  router.refresh.mockReset();
  browserGet();
});

describe("messages de WPD15", () => {
  it.each([
    ["OUT_OF_STOCK", /n'est plus disponible/],
    ["ORDER_EXPIRED", /délai de la commande est dépassé/],
    ["ORDER_ALREADY_PAID", /déjà payée/],
    ["PAYMENT_FAILED", /prestataire Mobile Money a refusé/],
    ["PAYMENT_REQUEST_CLOSED", /n'est plus en attente/],
    ["PAYMENT_IN_PROGRESS", /déjà en cours : validez-le sur votre téléphone/],
    ["NETWORK_UNAVAILABLE", /Vérifiez votre connexion/],
  ])("%s traduit", (code, text) => {
    expect(paymentErrorMessage(fail(code))).toMatch(text);
    expect(translated(fail(code)).message).toMatch(text);
  });

  it("pastilles des 8 états de la maquette, et du paiement remboursé (C17)", () => {
    expect(Object.keys(STATE_BADGES)).toEqual([
      "pending",
      "confirming",
      "paid",
      "failed",
      "declined",
      "expired",
      "cancelled",
      "outofstock",
      "refunded",
    ]);
  });

  it("libellé du montant selon l'état et la commande", () => {
    expect(amountLabel("course", "pending", false)).toBe("Total à payer");
    expect(amountLabel("kit", "pending", false)).toBe("Total à payer hors livraison");
    expect(amountLabel("kit", "pending", true)).toBe("Total à payer");
    expect(amountLabel("course", "declined", false)).toBe("Montant demandé");
  });
});

describe("PaymentRequestSummary (3 objets, 8 états)", () => {
  it("parcours : enfant bénéficiaire, dates, kit requis, montant du serveur", async () => {
    const { container } = render(
      <PaymentRequestSummary
        request={paymentRequest()}
        child={CHILD}
        state="pending"
        requiredKit={{ slug: "kit-capteurs", name: "Kit Capteurs Steamy" }}
      />,
    );
    expect(screen.getByText("Léa Adjovi")).toBeInTheDocument();
    expect(screen.getByText("13 ans · 4ᵉ · bénéficiaire")).toBeInTheDocument();
    expect(screen.getByText("À payer")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Capteurs électroniques" })).toBeInTheDocument();
    expect(screen.getByText("Parcours")).toBeInTheDocument();
    expect(screen.getByText("Kit Capteurs Steamy")).toBeInTheDocument();
    expect(screen.getByText("Total à payer").nextSibling).toHaveTextContent(/^18\s000\sF\sCFA$/);
    expect(screen.getByText(/valable jusqu'au/)).toBeInTheDocument();
    expect(screen.getByText(/débloqué pour Léa dès la confirmation/)).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("kit sans commande : articles et montant hors livraison (aucun calcul de total)", () => {
    render(<PaymentRequestSummary request={KIT_REQUEST} child={{ ...CHILD, age: null, schoolGrade: null, avatar: null }} state="pending" />);
    expect(screen.getByText("bénéficiaire")).toBeInTheDocument();
    expect(screen.getByText("Pack capteurs × 2").nextSibling).toHaveTextContent(/5\s000\sF\sCFA l'unité/);
    expect(screen.getByText("Total à payer hors livraison").nextSibling).toHaveTextContent(/^45\s000\sF\sCFA$/);
    expect(screen.getByText(/réservé pendant 30 minutes/)).toBeInTheDocument();
  });

  it("kit avec commande : lignes, livraison et total tels que reçus, même incohérents", () => {
    render(
      <PaymentRequestSummary
        request={KIT_REQUEST}
        child={CHILD}
        state="confirming"
        order={order({ total: 99999, deliveryZone: null as never })}
        address={<p>Adresse</p>}
      />,
    );
    expect(screen.getByText("Livraison").nextSibling).toHaveTextContent(/1\s500\sF\sCFA/);
    expect(screen.getByText("Total à payer").nextSibling).toHaveTextContent(/^99\s999\sF\sCFA$/);
    expect(screen.getByText("Confirmation…")).toBeInTheDocument();
    expect(screen.getByText("Adresse")).toBeInTheDocument();
    render(<PaymentRequestSummary request={KIT_REQUEST} child={CHILD} state="failed" order={order({ items: [{ ...order().items[0], quantity: 2, title: "Bot" }] })} />);
    expect(screen.getByText("Bot × 2")).toBeInTheDocument();
    expect(screen.getByText("Livraison · Cotonou")).toBeInTheDocument();
  });

  it.each([
    ["paid", "Payée"],
    ["declined", "Refusée"],
    ["expired", "Expirée"],
    ["cancelled", "Annulée"],
    ["failed", "Échec"],
    ["outofstock", "Rupture"],
  ] as const)("état %s : pastille « %s »", (state, label) => {
    render(<PaymentRequestSummary request={paymentRequest({ kind: "event" as never })} child={CHILD} state={state} />);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByText("Événement")).toBeInTheDocument();
  });
});

describe("DeclineRequestDialog", () => {
  function setup() {
    const onDeclined = vi.fn();
    const onClose = vi.fn();
    render(
      <DeclineRequestDialog
        open
        onClose={onClose}
        requestId={12}
        childFirstName="Léa"
        summary="Parcours Capteurs électroniques · 18 000 F CFA"
        onDeclined={onDeclined}
      />,
    );
    return { onDeclined, onClose };
  }

  it("motif facultatif transmis à l'enfant, refus envoyé", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValue(respond(200, {}));
    const { onDeclined } = setup();
    const dialog = screen.getByRole("dialog", { name: "Refuser la demande de Léa ?" });
    expect(dialog).toHaveTextContent("Léa sera prévenu·e de votre refus");
    await user.type(screen.getByRole("textbox", { name: /Motif/ }), "  Après les examens.  ");
    await user.click(within(dialog).getByRole("button", { name: "Refuser la demande" }));
    expect(POST).toHaveBeenCalledWith("/api/payments/payment-requests/{id}/decline/", {
      params: { path: { id: 12 } },
      body: { reason: "Après les examens." },
    });
    await waitFor(() => expect(onDeclined).toHaveBeenCalled());
  });

  it("demande déjà close ou panne : message ; « Annuler » sans appel", async () => {
    const user = userEvent.setup();
    const { onClose, onDeclined } = setup();
    POST.mockResolvedValueOnce(failure(409, "PAYMENT_REQUEST_CLOSED"));
    await user.click(screen.getByRole("button", { name: "Refuser la demande" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("n'est plus en attente");
    expect(router.refresh).toHaveBeenCalledTimes(1);
    POST.mockResolvedValueOnce(failure(500, "SERVER_ERROR"));
    await user.click(screen.getByRole("button", { name: "Refuser la demande" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Réessayez dans quelques instants"));
    expect(router.refresh).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(onClose).toHaveBeenCalled();
    expect(onDeclined).not.toHaveBeenCalled();
  });
});

describe("OrderPayment (WA03 → WA04 → WA05 / WA07)", () => {
  const SUCCESS = { message: <p>Le parcours est débloqué.</p>, action: { label: "Retour à l'accueil", href: "/parent" } };

  function setup(reference = vi.fn().mockResolvedValue({ ok: true, data: "CMD-1" })) {
    const onOrderClosed = vi.fn();
    const onState = vi.fn();
    render(
      <OrderPayment
        amount={18000}
        reference={reference}
        countries={COUNTRIES}
        preferred={PREFERRED}
        success={SUCCESS}
        onOrderClosed={onOrderClosed}
        onState={onState}
      />,
    );
    return { reference, onOrderClosed, onState };
  }

  it("paie la commande, attend la confirmation puis affiche le succès sur `succeeded` seulement", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValue(respond(201, payment()));
    const { reference, onState } = setup();
    await screen.findByRole("radio", { name: "MTN Mobile Money" });
    await user.click(payButton());
    expect(reference).toHaveBeenCalled();
    expect(POST).toHaveBeenCalledWith("/api/payments/orders/{reference}/payments/", {
      params: { path: { reference: "CMD-1" } },
      body: { country: "BJ", network: "mtn", msisdn: "+2290190000001" },
    });
    expect(onState).toHaveBeenCalledWith("confirming");
    expect(await screen.findByRole("heading", { name: "Paiement réussi !" })).toBeInTheDocument();
    await waitFor(() => expect(onState).toHaveBeenLastCalledWith("paid"));
    expect(GET).toHaveBeenCalledWith("/api/payments/orders/{reference}/", { params: { path: { reference: "CMD-1" } } });
    expect(screen.getByRole("link", { name: /Retour à l'accueil/ })).toHaveAttribute("href", "/parent");
  });

  it("paiement arrivé après le délai (C17) : commande relue remboursée, « Paiement remboursé » au lieu du succès", async () => {
    const user = userEvent.setup();
    browserGet(payment({ status: "succeeded" }), order({ status: "refunded" }));
    POST.mockResolvedValue(respond(201, payment()));
    const { onState } = setup();
    await screen.findByRole("radio", { name: "MTN Mobile Money" });
    await user.click(payButton());
    expect(await screen.findByRole("heading", { name: "Paiement remboursé" })).toBeInTheDocument();
    expect(screen.getByText(/il vous est remboursé automatiquement/)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Paiement réussi !" })).toBeNull();
    expect(screen.getByRole("link", { name: "Voir mes commandes" })).toHaveAttribute("href", "/parent/commandes");
    expect(onState).toHaveBeenLastCalledWith("refunded");
  });

  it("double clic sur « Réessayer le paiement » : un seul nouvel essai, bouton occupé pendant l'envoi", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValueOnce(respond(201, payment({ status: "failed", failureCode: "DECLINED" })));
    setup();
    await screen.findByRole("radio", { name: "MTN Mobile Money" });
    await user.click(payButton());
    const retry = await screen.findByRole("button", { name: "Réessayer le paiement" });
    let finish: (value: unknown) => void = () => {};
    POST.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    await user.dblClick(retry);
    expect(POST).toHaveBeenCalledTimes(2);
    expect(retry).toHaveAttribute("aria-busy", "true");
    await act(async () => finish(failure(409, "PAYMENT_IN_PROGRESS")));
    expect(await screen.findByRole("alert")).toHaveTextContent(/déjà en cours : validez-le sur votre téléphone/);
    expect(POST).toHaveBeenCalledTimes(2);
  });

  it("échec du prestataire : raison, « Réessayer » rejoue le numéro, « Changer de numéro » revient au formulaire", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValue(
      respond(201, payment({ status: "failed", failureCode: "DECLINED", failureReason: "Solde insuffisant" })),
    );
    const { onState } = setup();
    await screen.findByRole("radio", { name: "MTN Mobile Money" });
    await user.click(payButton());
    expect(await screen.findByText("Raison : Solde insuffisant")).toBeInTheDocument();
    expect(onState).toHaveBeenCalledWith("failed");
    await user.click(screen.getByRole("button", { name: "Réessayer le paiement" }));
    await waitFor(() => expect(POST).toHaveBeenCalledTimes(2));
    POST.mockResolvedValueOnce(failure(503, "NETWORK_UNAVAILABLE"));
    await user.click(await screen.findByRole("button", { name: "Réessayer le paiement" }));
    // Nouvel essai impossible : l'erreur est annoncée sous le panneau, qui reste affiché
    expect(await screen.findByRole("alert")).not.toBeEmptyDOMElement();
    await user.click(await screen.findByRole("button", { name: "Changer de numéro" }));
    expect(screen.getByRole("button", { name: /^Payer/ })).toBeInTheDocument();
    expect(onState).toHaveBeenLastCalledWith("pending");
  });

  it("erreurs de l'API traduites au formulaire ; commande expirée ou déjà payée signalée", async () => {
    const user = userEvent.setup();
    const { onOrderClosed } = setup();
    await screen.findByRole("radio", { name: "MTN Mobile Money" });
    for (const [code, text] of [
      ["PAYMENT_FAILED", /prestataire Mobile Money a refusé/],
      ["ORDER_EXPIRED", /délai de la commande est dépassé/],
      ["ORDER_ALREADY_PAID", /déjà payée/],
    ] as const) {
      POST.mockResolvedValueOnce(failure(409, code));
      await user.click(payButton());
      expect(await screen.findByText(text)).toBeInTheDocument();
    }
    expect(onOrderClosed).toHaveBeenCalledWith("ORDER_EXPIRED");
    expect(onOrderClosed).toHaveBeenCalledWith("ORDER_ALREADY_PAID");
  });

  it("création de la commande impossible (rupture) : message traduit, aucun paiement", async () => {
    const user = userEvent.setup();
    setup(vi.fn().mockResolvedValue(fail("OUT_OF_STOCK")));
    await screen.findByRole("radio", { name: "MTN Mobile Money" });
    await user.click(payButton());
    expect(await screen.findByText(/n'est plus disponible/)).toBeInTheDocument();
    expect(POST).not.toHaveBeenCalled();
  });
});

describe("KitAddressStep (adresse d'un kit, C10, D38)", () => {
  function setup(address: typeof ADDRESS | null = ADDRESS) {
    const onOrder = vi.fn();
    const onOutOfStock = vi.fn();
    render(
      <KitAddressStep
        requestId={12}
        address={address}
        defaultCountry="BJ"
        recipientName="Marie Adjovi"
        onOrder={onOrder}
        onOutOfStock={onOutOfStock}
      />,
    );
    return { onOrder, onOutOfStock };
  }
  const zone = () => screen.getByRole("combobox", { name: /^Ville ou zone/ });

  it("préremplie, enregistre l'adresse par défaut puis crée la commande de la demande", async () => {
    const user = userEvent.setup();
    PUT.mockResolvedValue(respond(200, ADDRESS));
    POST.mockResolvedValue(respond(201, order()));
    const { onOrder } = setup();
    await waitFor(() => expect(zone()).toHaveValue("2"));
    await user.click(screen.getByRole("checkbox", { name: "Enregistrer comme adresse par défaut" }));
    await user.click(screen.getByRole("button", { name: "Continuer vers le paiement" }));
    const deliveryAddress = {
      zoneId: 2,
      recipientName: "Marie Adjovi",
      city: "Cotonou",
      district: "Cocotomey",
      addressLine: "Rue 12.045",
    };
    await waitFor(() => expect(onOrder).toHaveBeenCalledWith(order()));
    expect(PUT).toHaveBeenCalledWith("/api/accounts/me/delivery-address/", { body: deliveryAddress });
    expect(POST).toHaveBeenCalledWith("/api/payments/orders/", { body: { paymentRequestId: 12, deliveryAddress } });
  });

  it("sans adresse : champs requis ; erreurs de l'API ; rupture", async () => {
    const user = userEvent.setup();
    const { onOutOfStock, onOrder } = setup(null);
    await waitFor(() => expect(screen.getByRole("option", { name: /Cotonou/ })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Continuer vers le paiement" }));
    expect(await screen.findByRole("link", { name: "Choisissez la zone de livraison." })).toBeInTheDocument();
    expect(POST).not.toHaveBeenCalled();

    await user.selectOptions(zone(), "2");
    await user.type(screen.getByRole("textbox", { name: /^Ville\b/ }), "Cotonou");
    await user.type(screen.getByRole("textbox", { name: /^Quartier/ }), "Akpakpa");
    await user.type(screen.getByRole("textbox", { name: /^Rue/ }), "Rue 5");
    for (const [answer, text] of [
      [failure(409, "DELIVERY_ZONE_UNAVAILABLE"), "Cette zone n'est plus desservie. Choisissez-en une autre."],
      [failure(400, "VALIDATION_ERROR", { "deliveryAddress.addressLine": "Trop long.", other: "x" }), "Trop long."],
      [failure(500, "SERVER_ERROR"), /Réessayez dans quelques instants/],
    ] as const) {
      POST.mockResolvedValueOnce(answer);
      await user.click(screen.getByRole("button", { name: "Continuer vers le paiement" }));
      await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(text));
    }
    POST.mockResolvedValueOnce(failure(409, "OUT_OF_STOCK"));
    await user.click(screen.getByRole("button", { name: "Continuer vers le paiement" }));
    await waitFor(() => expect(onOutOfStock).toHaveBeenCalled());
    expect(onOrder).not.toHaveBeenCalled();
    expect(PUT).not.toHaveBeenCalled();
  });
});

describe("PaymentRequestFlow (WPD15 en attente)", () => {
  const BASE = {
    child: CHILD,
    requiredKit: null,
    address: ADDRESS,
    defaultCountry: "BJ",
    parentName: "Marie Adjovi",
    countries: COUNTRIES,
    preferred: PREFERRED,
  };

  it("parcours : la commande est créée au paiement, puis le succès met la pastille à « Payée »", async () => {
    const user = userEvent.setup();
    POST.mockImplementation(async (path: string) =>
      path === "/api/payments/orders/" ? respond(201, order({ kind: "course", total: 18000 })) : respond(201, payment()),
    );
    const { container } = render(<PaymentRequestFlow {...BASE} request={paymentRequest()} order={null} />);
    expect(screen.getByRole("button", { name: /^Payer 18\s000/ })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
    await screen.findByRole("radio", { name: "MTN Mobile Money" });
    await user.click(payButton());
    expect(POST).toHaveBeenCalledWith("/api/payments/orders/", { body: { paymentRequestId: 12 } });
    expect(await screen.findByRole("heading", { name: "Paiement réussi !" })).toBeInTheDocument();
    expect(await screen.findByText("Payée")).toBeInTheDocument();
    expect(screen.getByText(/Capteurs électroniques/, { selector: "strong" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Refuser la demande" })).toBeNull();
  });

  it("demande close entre-temps : l'écran se relit", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValue(failure(409, "PAYMENT_REQUEST_CLOSED"));
    render(<PaymentRequestFlow {...BASE} request={paymentRequest()} order={null} />);
    await screen.findByRole("radio", { name: "MTN Mobile Money" });
    await user.click(payButton());
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
  });

  it("commande en attente reprise, déjà payée : l'écran se relit", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValue(failure(409, "ORDER_ALREADY_PAID"));
    render(<PaymentRequestFlow {...BASE} request={paymentRequest()} order={order({ kind: "course", total: 18000 })} />);
    await screen.findByRole("radio", { name: "MTN Mobile Money" });
    await user.click(payButton());
    expect(POST).toHaveBeenCalledWith("/api/payments/orders/{reference}/payments/", expect.anything());
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
  });

  it("kit : adresse, commande (frais et total du serveur), modification, puis commande expirée", async () => {
    const user = userEvent.setup();
    POST.mockImplementation(async (path: string) =>
      path === "/api/payments/orders/" ? respond(201, order()) : failure(409, "ORDER_EXPIRED"),
    );
    render(<PaymentRequestFlow {...BASE} request={KIT_REQUEST} order={null} />);
    expect(screen.getByRole("heading", { name: "Livraison du kit" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("combobox", { name: /^Ville ou zone/ })).toHaveValue("2"));
    await user.click(screen.getByRole("button", { name: "Continuer vers le paiement" }));
    expect(await screen.findByRole("button", { name: /^Payer 46\s500/ })).toBeInTheDocument();
    expect(screen.getByText("Marie Adjovi · Cocotomey, Rue 12.045, Cotonou")).toBeInTheDocument();
    expect(screen.getByText("Zone : Cotonou · 3 à 5 jours")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Modifier/ }));
    expect(screen.getByRole("form", { name: "Adresse de livraison" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continuer vers le paiement" }));
    await screen.findByRole("radio", { name: "MTN Mobile Money" });
    await user.click(payButton());
    expect(await screen.findByRole("status")).toHaveTextContent("Le délai de réservation est dépassé");
    expect(screen.getByRole("form", { name: "Adresse de livraison" })).toBeInTheDocument();
  });

  it("kit en rupture : paiement impossible, refus proposé ; refus envoyé → l'écran se relit", async () => {
    const user = userEvent.setup();
    POST.mockImplementation(async (path: string) =>
      path === "/api/payments/orders/" ? failure(409, "OUT_OF_STOCK") : respond(200, {}),
    );
    render(<PaymentRequestFlow {...BASE} request={KIT_REQUEST} order={null} />);
    await waitFor(() => expect(screen.getByRole("combobox", { name: /^Ville ou zone/ })).toHaveValue("2"));
    await user.click(screen.getByRole("button", { name: "Continuer vers le paiement" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Kit en rupture de stock");
    expect(screen.getByText("Rupture")).toBeInTheDocument();
    await user.click(within(alert).getByRole("button", { name: "Refuser la demande" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Refuser la demande" }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
  });

  it("kit avec commande reprise : paiement direct ; « Refuser la demande » ouvre la modale", async () => {
    const user = userEvent.setup();
    render(<PaymentRequestFlow {...BASE} request={KIT_REQUEST} order={order({ deliveryAddress: null, deliveryZone: null as never })} />);
    expect(screen.getByRole("button", { name: /^Payer 46\s500/ })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Refuser la demande" }));
    expect(screen.getByRole("dialog", { name: "Refuser la demande de Léa ?" })).toHaveTextContent(/Kit Steamy Bot v1, Pack capteurs · 46\s500/);
    await act(async () => {
      await user.click(screen.getByRole("button", { name: "Annuler" }));
    });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("ClosedRequest (lecture seule)", () => {
  it.each([
    [{ status: "paid", decidedAt: "2026-10-14T10:00:00Z", orderReference: "CMD-1" }, "Cette demande est réglée", /Payée le 14 octobre 2026/],
    [{ status: "paid", decidedAt: null }, "Cette demande est réglée", /paiement a été confirmé/],
    [
      { status: "declined", decidedAt: "2026-10-14T10:00:00Z", declineReason: "Après les examens." },
      "Vous avez refusé cette demande",
      /Motif transmis à Léa : « Après les examens. »/,
    ],
    [{ status: "declined", decidedAt: null, declineReason: "" }, "Vous avez refusé cette demande", null],
    [{ status: "expired" }, "Cette demande a expiré", /20 octobre 2026 \(7 jours\)/],
    [{ status: "cancelled", decidedAt: "2026-10-15T10:00:00Z" }, "Léa a annulé sa demande", /Annulée le 15 octobre 2026/],
    [{ status: "cancelled", decidedAt: null }, "Léa a annulé sa demande", /^Il n'y a plus rien à régler/],
  ] as const)("%o", async (overrides, title, body) => {
    const { container } = render(
      <ClosedRequest request={paymentRequest(overrides as never)} firstName="Léa" />,
    );
    expect(screen.getByRole("heading", { level: 2, name: title })).toBeInTheDocument();
    if (body) expect(screen.getByText(body)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retour à l'accueil" })).toHaveAttribute("href", "/parent");
    expect(screen.queryByRole("button", { name: /^Payer/ })).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("réglée : lien vers la commande", () => {
    render(<ClosedRequest request={paymentRequest({ status: "paid", orderReference: "CMD-1" })} firstName="Léa" />);
    expect(screen.getByRole("link", { name: "Voir la commande" })).toHaveAttribute("href", "/parent/commandes/CMD-1");
  });
});
