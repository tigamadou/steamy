import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";
import { ok, paymentRequest } from "@/test/unlock-fixtures";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
const browser = { GET: vi.fn(), POST: vi.fn() };
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => browser }));
const server = { GET: vi.fn() };
vi.mock("@/lib/api", () => ({ getServerApi: async () => server }));

const { PaymentRequestView, REQUEST_POLL_MS } = await import("./PaymentRequestView");
const { PendingRequestsBanner } = await import("./PendingRequestsBanner");
const { RequestSkeleton } = await import("./RequestSkeleton");
const { getPaymentRequest, getPendingRequests } = await import("./server");
const { requestTitle, REQUEST_STATUS_LABELS } = await import("./types");
const { default: RequestPage } = await import("@/app/(apprenant)/apprenant/(shell)/demandes/[id]/page");
const { default: RequestNotFound } = await import("@/app/(apprenant)/apprenant/(shell)/demandes/[id]/not-found");

function ko(status: number, code: string, fields: Record<string, { code: string; message: string }[]> = {}) {
  return { data: undefined, error: { code, message: "Message de l'API", fields }, response: new Response(null, { status }) };
}

/** Maintenant : avant la relance possible (14 oct. 10 h, heure de Porto-Novo). */
const NOW = new Date("2026-10-13T12:00:00Z");

beforeEach(() => {
  push.mockReset();
  browser.GET.mockReset();
  browser.POST.mockReset();
  server.GET.mockReset();
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("PaymentRequestView · WA02 en attente", () => {
  it("récapitulatif, parent, attente, échéance ; relance pas encore possible", async () => {
    vi.useFakeTimers({ now: NOW, shouldAdvanceTime: true });
    const { container } = render(<PaymentRequestView initial={paymentRequest()} />);
    expect(screen.getByRole("heading", { level: 2, name: "On a envoyé ta demande à Marie" })).toBeInTheDocument();
    expect(screen.getByText("Capteurs électroniques", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText(/18\s000 F CFA/)).toBeInTheDocument();
    expect(screen.getByText("Demande envoyée à Marie · en attente du paiement…")).toBeInTheDocument();
    expect(screen.getByText("Marie a jusqu'au 20 octobre 2026 pour la régler.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Relancer mon parent" })).toBeDisabled();
    expect(screen.getByText("Tu pourras relancer ton parent le 14 octobre 2026 à 10:00.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Capteurs électroniques" })).toHaveAttribute(
      "href",
      "/apprenant/catalogue/capteurs-electroniques",
    );
    expect(screen.queryByText(/Changer de parent|Renvoyer le lien/)).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("interroge le statut toutes les 10 s : réglée → lien vers le parcours", async () => {
    vi.useFakeTimers({ now: NOW });
    browser.GET.mockResolvedValueOnce(ok(paymentRequest())).mockResolvedValueOnce(
      ok(paymentRequest({ status: "paid" as never, orderReference: "STM-1", nextResendAt: null })),
    );
    render(<PaymentRequestView initial={paymentRequest()} />);
    await act(() => vi.advanceTimersByTimeAsync(REQUEST_POLL_MS));
    expect(browser.GET).toHaveBeenCalledWith("/api/payments/payment-requests/{id}/", { params: { path: { id: 12 } } });
    await act(() => vi.advanceTimersByTimeAsync(REQUEST_POLL_MS));
    expect(screen.getByRole("heading", { level: 2, name: "C'est réglé !" })).toBeInTheDocument();
    expect(screen.getByText("Marie a réglé ta demande : ton parcours est débloqué.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Accéder au parcours" })).toHaveAttribute(
      "href",
      "/apprenant/parcours/capteurs-electroniques",
    );
    await act(() => vi.advanceTimersByTimeAsync(REQUEST_POLL_MS * 3));
    expect(browser.GET).toHaveBeenCalledTimes(2);
  });

  it("une lecture ratée n'interrompt pas l'attente", async () => {
    vi.useFakeTimers({ now: NOW });
    browser.GET.mockResolvedValue(ko(500, "SERVER_ERROR"));
    render(<PaymentRequestView initial={paymentRequest()} />);
    await act(() => vi.advanceTimersByTimeAsync(REQUEST_POLL_MS));
    expect(screen.getByRole("heading", { name: "On a envoyé ta demande à Marie" })).toBeInTheDocument();
  });

  it("relance possible : on relance, toast, puis prochaine relance annoncée", async () => {
    const user = userEvent.setup();
    browser.POST.mockResolvedValue(ok(paymentRequest({ nextResendAt: "2099-01-02T09:00:00Z" })));
    render(<PaymentRequestView initial={paymentRequest({ nextResendAt: "2020-01-01T00:00:00Z" })} />);
    await user.click(screen.getByRole("button", { name: "Relancer mon parent" }));
    expect(browser.POST).toHaveBeenCalledWith("/api/payments/payment-requests/{id}/resend/", {
      params: { path: { id: 12 } },
    });
    expect(screen.getByText("On a relancé Marie.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Relancer mon parent" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Fermer" }));
    expect(screen.queryByText("On a relancé Marie.")).not.toBeInTheDocument();
  });

  it("relance refusée par le serveur : message de l'API", async () => {
    const user = userEvent.setup();
    browser.POST.mockResolvedValue(ko(429, "THROTTLED"));
    render(<PaymentRequestView initial={paymentRequest({ nextResendAt: "2020-01-01T00:00:00Z" })} />);
    await user.click(screen.getByRole("button", { name: "Relancer mon parent" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Trop de tentatives. Réessaie dans quelques instants.");
  });

  it("relances épuisées : bouton désactivé et explication", () => {
    render(<PaymentRequestView initial={paymentRequest({ nextResendAt: null })} />);
    expect(screen.getByRole("button", { name: "Relancer mon parent" })).toBeDisabled();
    expect(screen.getByText("Tu as déjà relancé ton parent autant de fois que possible.")).toBeInTheDocument();
  });

  it("annulation confirmée dans une modale ; « Garder la demande » ne change rien", async () => {
    const user = userEvent.setup();
    browser.POST.mockResolvedValue(ok(paymentRequest({ status: "cancelled", nextResendAt: null })));
    render(<PaymentRequestView initial={paymentRequest()} />);
    await user.click(screen.getByRole("button", { name: "Annuler la demande" }));
    const dialog = screen.getByRole("dialog", { name: "Annuler la demande ?" });
    await user.click(within(dialog).getByRole("button", { name: "Garder la demande" }));
    await user.click(screen.getByRole("button", { name: "Annuler la demande" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(browser.POST).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Annuler la demande" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Annuler la demande" }));
    expect(browser.POST).toHaveBeenCalledWith("/api/payments/payment-requests/{id}/cancel/", {
      params: { path: { id: 12 } },
    });
    expect(screen.getByRole("heading", { level: 2, name: "Tu as annulé cette demande" })).toBeInTheDocument();
  });

  it("annulation d'une demande déjà close : message, puis statut relu", async () => {
    const user = userEvent.setup();
    browser.POST.mockResolvedValue(ko(409, "PAYMENT_REQUEST_CLOSED"));
    browser.GET.mockResolvedValueOnce(ok(paymentRequest({ status: "paid" })));
    render(<PaymentRequestView initial={paymentRequest()} />);
    await user.click(screen.getByRole("button", { name: "Annuler la demande" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Annuler la demande" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Message de l'API");
    expect(await screen.findByRole("heading", { name: "C'est réglé !" })).toBeInTheDocument();
  });

  it("annulation impossible et relecture ratée : la demande reste affichée", async () => {
    const user = userEvent.setup();
    browser.POST.mockRejectedValue(new Error("réseau"));
    browser.GET.mockRejectedValue(new Error("réseau"));
    render(<PaymentRequestView initial={paymentRequest()} />);
    await user.click(screen.getByRole("button", { name: "Annuler la demande" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Annuler la demande" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Le serveur est injoignable");
    expect(screen.getByRole("heading", { name: "On a envoyé ta demande à Marie" })).toBeInTheDocument();
  });
});

describe("PaymentRequestView · issues", () => {
  it.each([
    ["declined", "Marie a refusé ta demande", /Parles-en avec Marie/],
    ["expired", "Ta demande a expiré", /ne l'a pas réglée à temps/],
    ["cancelled", "Tu as annulé cette demande", /refaire une demande à tout moment/],
  ] as const)("%s : message et « Refaire la demande » → nouvelle WA02", async (status, title, body) => {
    const user = userEvent.setup();
    browser.POST.mockResolvedValue(ok(paymentRequest({ id: 30 })));
    render(<PaymentRequestView initial={paymentRequest({ status, nextResendAt: null })} />);
    expect(screen.getByRole("heading", { level: 2, name: title })).toBeInTheDocument();
    expect(screen.getByText(body)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Relancer mon parent" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retour au catalogue" })).toHaveAttribute("href", "/apprenant/catalogue");
    await user.click(screen.getByRole("button", { name: "Refaire la demande" }));
    expect(browser.POST).toHaveBeenCalledWith("/api/payments/payment-requests/", {
      body: { kind: "course", courseSlug: "capteurs-electroniques" },
    });
    expect(push).toHaveBeenCalledWith("/apprenant/demandes/30");
  });

  it("nouvelle demande refusée : message du champ", async () => {
    const user = userEvent.setup();
    browser.POST.mockResolvedValue(
      ko(400, "VALIDATION_ERROR", { courseSlug: [{ code: "ALREADY_ENROLLED", message: "Tu suis déjà ce parcours." }] }),
    );
    render(<PaymentRequestView initial={paymentRequest({ status: "expired", nextResendAt: null })} />);
    await user.click(screen.getByRole("button", { name: "Refaire la demande" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Tu suis déjà ce parcours.");
    expect(push).not.toHaveBeenCalled();
  });

  it("demande sans parcours : ni lien vers un parcours ni nouvelle demande", () => {
    const kit = { course: null, items: [{ kitSlug: "bot", title: "Steamy Bot", unitPrice: 35000, quantity: 1 }] };
    const { unmount } = render(<PaymentRequestView initial={paymentRequest({ ...kit, status: "declined" })} />);
    expect(screen.queryByRole("button", { name: "Refaire la demande" })).not.toBeInTheDocument();
    unmount();
    render(<PaymentRequestView initial={paymentRequest({ ...kit, status: "paid", nextResendAt: null })} />);
    expect(screen.queryByRole("link", { name: "Accéder au parcours" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link").map((link) => link.textContent)).toEqual(["Catalogue"]);
  });
});

describe("types", () => {
  it("libellé : parcours, ou kits avec quantités", () => {
    expect(requestTitle(paymentRequest())).toBe("Capteurs électroniques");
    expect(
      requestTitle({
        course: null,
        items: [
          { kitSlug: "a", title: "Steamy Bot", unitPrice: 1, quantity: 2 },
          { kitSlug: "b", title: "Pack Électronique", unitPrice: 1, quantity: 1 },
        ],
      }),
    ).toBe("Steamy Bot × 2, Pack Électronique");
    expect(REQUEST_STATUS_LABELS.pending).toBe("En attente de ton parent");
  });
});

describe("lectures serveur", () => {
  it("getPaymentRequest : la demande, `null` en 404, erreur sinon", async () => {
    server.GET.mockResolvedValueOnce(ok(paymentRequest()));
    expect((await getPaymentRequest(12))?.id).toBe(12);
    expect(server.GET).toHaveBeenCalledWith("/api/payments/payment-requests/{id}/", { params: { path: { id: 12 } } });
    server.GET.mockResolvedValueOnce(ko(404, "NOT_FOUND"));
    expect(await getPaymentRequest(13)).toBeNull();
    server.GET.mockResolvedValueOnce(ko(500, "SERVER_ERROR"));
    await expect(getPaymentRequest(14)).rejects.toThrow("Demande de paiement illisible (500)");
  });

  it("getPendingRequests : demandes en attente, erreur si illisibles", async () => {
    server.GET.mockResolvedValueOnce(ok({ count: 1, results: [paymentRequest()] }));
    expect(await getPendingRequests()).toHaveLength(1);
    expect(server.GET).toHaveBeenCalledWith("/api/payments/payment-requests/", {
      params: { query: { status: "pending", pageSize: 50 } },
    });
    server.GET.mockResolvedValueOnce(ok({ count: 0 }));
    expect(await getPendingRequests()).toEqual([]);
    server.GET.mockResolvedValueOnce(ko(500, "SERVER_ERROR"));
    await expect(getPendingRequests()).rejects.toThrow("Demandes de paiement illisibles (500)");
  });
});

describe("PendingRequestsBanner · WD23", () => {
  it("une demande : titre au singulier, montant, échéance, lien vers WA02", async () => {
    server.GET.mockResolvedValue(ok({ results: [paymentRequest()] }));
    const { container } = render((await PendingRequestsBanner()) as ReactElement);
    expect(screen.getByRole("heading", { level: 2, name: "En attente de ton parent · 1 demande" })).toBeInTheDocument();
    expect(screen.getByText(/18\s000 F CFA · demandé le 13 octobre 2026/)).toBeInTheDocument();
    expect(screen.getByText(/ton parent a jusqu'au 20 octobre 2026/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir la demande : Capteurs électroniques" })).toHaveAttribute(
      "href",
      "/apprenant/demandes/12",
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("plusieurs demandes : pluriel", async () => {
    server.GET.mockResolvedValue(ok({ results: [paymentRequest(), paymentRequest({ id: 13 })] }));
    render((await PendingRequestsBanner()) as ReactElement);
    expect(screen.getByRole("heading", { name: "En attente de ton parent · 2 demandes" })).toBeInTheDocument();
  });

  it("aucune demande, ou demandes illisibles : rien", async () => {
    server.GET.mockResolvedValueOnce(ok({ results: [] }));
    expect(await PendingRequestsBanner()).toBeNull();
    server.GET.mockResolvedValueOnce(ko(500, "SERVER_ERROR"));
    expect(await PendingRequestsBanner()).toBeNull();
  });
});

describe("page WA02 /apprenant/demandes/[id]", () => {
  type Page = ReactElement<{ children: ReactElement<{ children: ReactElement<{ params: Promise<{ id: string }> }> }> }>;

  async function load(id: string) {
    const page = RequestPage({ params: Promise.resolve({ id }) } as never) as Page;
    const loader = page.props.children.props.children;
    return (loader.type as (props: unknown) => Promise<ReactElement>)(loader.props);
  }

  it("demande lue côté serveur, rendue par la vue", async () => {
    server.GET.mockResolvedValue(ok(paymentRequest()));
    render(await load("12"));
    expect(screen.getByRole("heading", { name: "On a envoyé ta demande à Marie" })).toBeInTheDocument();
  });

  it.each(["abc", "0", "-3"])("identifiant invalide « %s » → 404", async (id) => {
    await expect(load(id)).rejects.toThrow("NEXT_NOT_FOUND");
    expect(server.GET).not.toHaveBeenCalled();
  });

  it("demande inconnue → 404", async () => {
    server.GET.mockResolvedValue(ko(404, "NOT_FOUND"));
    await expect(load("99")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("404 dans le shell et squelette", () => {
    render(<RequestNotFound />);
    expect(screen.getByRole("heading", { level: 2, name: "Cette demande est introuvable" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir mes commandes" })).toHaveAttribute("href", "/apprenant/profil/commandes");
    render(<RequestSkeleton />);
    expect(screen.getByRole("status", { name: "Chargement de ta demande…" })).toBeInTheDocument();
  });
});
