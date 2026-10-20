import type { Schemas } from "@steamy/api-client";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetReferentials } from "@/lib/use-referential";
import { axe } from "@/test/axe";
import { child } from "@/test/parent-fixtures";
import { COUNTRIES, NETWORKS, order, payment } from "@/test/payment-request-fixtures";

const GET = vi.fn();
const POST = vi.fn();
const router = { refresh: vi.fn() };
const serverGET = vi.fn();
const getUpcomingEvents = vi.fn();
const getMyApplications = vi.fn();
const getEvent = vi.fn();
const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ GET, POST }) }));
vi.mock("@/lib/api", () => ({ getServerApi: async () => ({ GET: serverGET }) }));
vi.mock("@/lib/referentials", () => ({ getCountries: async () => COUNTRIES }));
vi.mock("@/features/events/api", () => ({
  getUpcomingEvents: () => getUpcomingEvents(),
  getMyApplications: () => getMyApplications(),
  getEvent: (slug: string) => getEvent(slug),
}));
vi.mock("next/navigation", () => ({ useRouter: () => router, notFound: () => notFound() }));
vi.mock("@/lib/use-visible-polling", () => ({
  useVisiblePolling: (poll: () => void, _ms: number, enabled: boolean) => {
    useEffect(() => {
      if (enabled) poll();
    }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps
  },
}));

const { PARENT_APPLICATION_STATUS, applicationErrorMessage } = await import("./status");
const { EventApplicationRow } = await import("./EventApplicationRow");
const { RefuseApplicationDialog } = await import("./RefuseApplicationDialog");
const { EventOrderPayment } = await import("./EventOrderPayment");
const { EventSignupForm } = await import("./EventSignupForm");
const { ParentEventsHome, ParentEventsHomeSkeleton, highlightedApplication } = await import("./ParentEventsHome");
const { ParentEventView, ParentEventAction, parentEventBreadcrumb } = await import("./ParentEventView");
const { EventSignup, EventSignupSkeleton } = await import("./EventSignup");

const respond = (status: number, data?: unknown) => ({ data, response: new Response(null, { status }) });
const failure = (status: number, code: string) => ({
  error: { code, message: "" },
  response: new Response(null, { status }),
});
const fail = (code: string) => ({ ok: false as const, code: code as never, message: "", fields: {} });

const FUTURE = new Date(Date.now() + 20 * 86_400_000).toISOString();
const LATER = new Date(Date.now() + 20 * 86_400_000 + 3 * 3_600_000).toISOString();
const DEADLINE = new Date(Date.now() + 10 * 86_400_000).toISOString();

function event(overrides: Partial<Schemas["SteamyEventDetail"]> = {}): Schemas["SteamyEventDetail"] {
  return {
    slug: "defi-robots",
    title: "Défi robots de Cotonou",
    emoji: "🤖",
    color: "var(--cat-robotique)",
    startsAt: FUTURE,
    endsAt: LATER,
    city: "Cotonou",
    venue: "Institut français",
    online: false,
    audience: "10 – 17 ans",
    price: 5000,
    isFree: false,
    capacity: 40,
    seatsLeft: 12,
    applicationDeadline: DEADLINE,
    applicationsOpen: true,
    isPast: false,
    description: "Une demi-journée de défis.",
    ...overrides,
  } as Schemas["SteamyEventDetail"];
}

function application(overrides: Partial<Schemas["Application"]> = {}): Schemas["Application"] {
  return {
    id: 4,
    event: {
      slug: "defi-robots",
      title: "Défi robots de Cotonou",
      emoji: "🤖",
      color: "var(--cat-robotique)",
      startsAt: FUTURE,
      city: "Cotonou",
      online: false,
      price: 5000,
    },
    learner: { id: 7, firstName: "Léa" },
    status: "pending_parent",
    motivation: "Je veux tester mon robot.",
    selfLevel: "beginner",
    ticketUsed: false,
    parentDecidedAt: null,
    refusalReason: "",
    orderReference: null,
    createdAt: "2026-10-15T08:00:00Z",
    ...overrides,
  };
}

const PREFERRED = { country: "BJ", network: "mtn", phone: "+2290190000001" };

/** Navigateur : commande d'événement, réseaux, paiement interrogé. */
function browserGet() {
  GET.mockImplementation(async (path: string) => {
    if (path === "/api/payments/orders/{reference}/") return respond(200, order({ kind: "event", total: 5000 }));
    if (path === "/api/referentials/payment-networks/") return respond(200, NETWORKS);
    return respond(200, payment({ status: "succeeded" }));
  });
}

beforeEach(() => {
  resetReferentials();
  GET.mockReset();
  POST.mockReset();
  router.refresh.mockReset();
  serverGET.mockReset();
  browserGet();
});

describe("statuts et erreurs des candidatures", () => {
  it("libellés au vouvoiement", () => {
    expect(PARENT_APPLICATION_STATUS.pending_parent.label).toBe("À examiner");
    expect(PARENT_APPLICATION_STATUS.pending_payment.label).toBe("Paiement en attente");
  });

  it.each([
    ["EVENT_FULL", /complet/],
    ["EVENT_CLOSED", /closes/],
    ["ALREADY_APPLIED", /déjà inscrit/],
    ["APPLICATION_ALREADY_RESOLVED", /déjà été traitée/],
    ["SERVER_ERROR", /Réessayez/],
  ])("%s", (code, text) => {
    expect(applicationErrorMessage(fail(code))).toMatch(text);
  });
});

describe("EventApplicationRow (WPD06, D53)", () => {
  function setup(overrides: Partial<Schemas["Application"]> = {}, highlighted = false) {
    return render(
      <EventApplicationRow
        application={application(overrides)}
        countries={COUNTRIES}
        preferred={PREFERRED}
        highlighted={highlighted}
      />,
    );
  }

  it("candidature en attente : enfant, motivation, « Accepter » / « Refuser » ; mise en avant au focus", async () => {
    const { container } = setup({}, true);
    const row = screen.getByRole("article", { name: "Défi robots de Cotonou" });
    expect(row).toHaveFocus();
    expect(row).toHaveTextContent(/Léa · 📅/);
    expect(row).toHaveTextContent("« Je veux tester mon robot. »");
    expect(within(row).getByText("À examiner")).toBeInTheDocument();
    expect(within(row).getByRole("link", { name: "Défi robots de Cotonou" })).toHaveAttribute(
      "href",
      "/parent/evenements/defi-robots",
    );
    expect(within(row).getByRole("button", { name: /^Accepter\s*la candidature de Léa$/ })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("accepter un événement gratuit ou avec ticket : acceptée, l'écran se relit", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValue(respond(200, application({ status: "accepted" })));
    setup({ ticketUsed: true });
    expect(screen.getByText(/Ticket Steamy Events/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Accepter/ }));
    expect(POST).toHaveBeenCalledWith("/api/events/applications/{id}/accept/", { params: { path: { id: 4 } } });
    expect(await screen.findByText("Acceptée")).toBeInTheDocument();
    expect(router.refresh).toHaveBeenCalled();
    // Les boutons ont disparu : le focus est sur la ligne
    expect(screen.getByRole("article", { name: "Défi robots de Cotonou" })).toHaveFocus();
  });

  it("accepter un événement payant : la place est réservée et le paiement s'ouvre (commande d'événement)", async () => {
    const user = userEvent.setup();
    POST.mockImplementation(async (path: string) =>
      path === "/api/events/applications/{id}/accept/"
        ? respond(200, application({ status: "pending_payment", orderReference: "CMD-EVT" }))
        : respond(201, payment()),
    );
    setup();
    await user.click(screen.getByRole("button", { name: /^Accepter/ }));
    expect(await screen.findByText("Paiement en attente")).toBeInTheDocument();
    expect(await screen.findByText(/Place réservée jusqu'au/)).toBeInTheDocument();
    await screen.findByRole("radio", { name: "MTN Mobile Money" });
    await user.click(screen.getByRole("button", { name: /^Payer 5\s000/ }));
    expect(POST).toHaveBeenCalledWith("/api/payments/orders/{reference}/payments/", expect.anything());
    expect(await screen.findByText(/La participation de Léa à/)).toBeInTheDocument();
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it("paiement en attente : « Payer la participation » ; erreur d'accord affichée", async () => {
    const user = userEvent.setup();
    setup({ status: "pending_payment", orderReference: "CMD-EVT" });
    await user.click(screen.getByRole("button", { name: /^Payer la participation\s*de Léa$/ }));
    expect(await screen.findByRole("button", { name: /^Payer 5\s000/ })).toBeInTheDocument();
  });

  it("événement complet à l'accord : message, candidature inchangée", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValue(failure(409, "EVENT_FULL"));
    setup();
    await user.click(screen.getByRole("button", { name: /^Accepter/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Cet événement est complet");
    expect(screen.getByText("À examiner")).toBeInTheDocument();
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it("candidature déjà traitée à l'accord : message et écran relu", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValue(failure(409, "APPLICATION_ALREADY_RESOLVED"));
    setup();
    await user.click(screen.getByRole("button", { name: /^Accepter/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("déjà été traitée");
    expect(router.refresh).toHaveBeenCalled();
  });

  it("refuser ouvre la modale ; candidature refusée avec motif affiché", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValue(respond(200, application({ status: "refused", refusalReason: "Après les examens." })));
    const view = setup();
    // « Annuler » referme la modale sans appel
    await user.click(screen.getByRole("button", { name: /^Refuser\s*la candidature de Léa$/ }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Annuler" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(POST).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /^Refuser\s*la candidature de Léa$/ }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Refuser la candidature" }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    // La ligne affiche aussitôt la candidature refusée renvoyée par l'API, et reçoit le focus
    expect(screen.getByText("Refusée")).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Défi robots de Cotonou" })).toHaveFocus();
    expect(screen.getByText("Motif : Après les examens.")).toBeInTheDocument();
    view.unmount();
    setup({ status: "refused", refusalReason: "Trop loin." });
    expect(screen.getByText("Motif : Trop loin.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Accepter/ })).toBeNull();
  });
});

describe("RefuseApplicationDialog", () => {
  it("motif facultatif envoyé ; erreur ; annulation", async () => {
    const user = userEvent.setup();
    const onRefused = vi.fn();
    const onClose = vi.fn();
    render(
      <RefuseApplicationDialog
        open
        onClose={onClose}
        applicationId={4}
        childFirstName="Léa"
        eventTitle="Défi robots"
        onRefused={onRefused}
      />,
    );
    expect(screen.getByRole("dialog", { name: "Refuser la candidature de Léa ?" })).toHaveTextContent(
      "Léa sera prévenu·e",
    );
    POST.mockResolvedValueOnce(failure(409, "APPLICATION_ALREADY_RESOLVED"));
    await user.type(screen.getByRole("textbox", { name: /Motif/ }), " Trop loin. ");
    await user.click(screen.getByRole("button", { name: "Refuser la candidature" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("déjà été traitée");
    expect(router.refresh).toHaveBeenCalledTimes(1);
    expect(POST).toHaveBeenCalledWith("/api/events/applications/{id}/refuse/", {
      params: { path: { id: 4 } },
      body: { reason: "Trop loin." },
    });
    POST.mockResolvedValueOnce(respond(200, application({ status: "refused" })));
    await user.click(screen.getByRole("button", { name: "Refuser la candidature" }));
    await waitFor(() => expect(onRefused).toHaveBeenCalledWith(expect.objectContaining({ status: "refused" })));
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe("EventOrderPayment", () => {
  it("commande illisible : erreur et « Réessayer »", async () => {
    const user = userEvent.setup();
    GET.mockResolvedValueOnce(failure(500, "SERVER_ERROR"));
    render(<EventOrderPayment orderReference="CMD-EVT" countries={COUNTRIES} success={<p>ok</p>} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Réessayez dans quelques instants");
    await user.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(await screen.findByRole("button", { name: /^Payer 5\s000/ })).toBeInTheDocument();
  });

  it("commande expirée ou déjà payée : l'écran se relit", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValue(failure(409, "ORDER_EXPIRED"));
    render(<EventOrderPayment orderReference="CMD-EVT" countries={COUNTRIES} preferred={PREFERRED} success={<p>ok</p>} />);
    await screen.findByRole("radio", { name: "MTN Mobile Money" });
    await user.click(screen.getByRole("button", { name: /^Payer/ }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    // La commande est relue : la fermeture est constatée sans attendre l'écran serveur
    await waitFor(() =>
      expect(GET.mock.calls.filter(([path]) => path === "/api/payments/orders/{reference}/")).toHaveLength(2),
    );
  });

  it.each([
    ["paid", "Cette participation est déjà payée : l'inscription est confirmée."],
    ["cancelled", "Commande annulée : elle n'a pas été payée à temps et le stock a été libéré."],
    ["refunded", "Commande remboursée : elle vous a été remboursée."],
  ] as const)("commande %s : état dédié, aucun paiement proposé", async (status, text) => {
    GET.mockImplementation(async (path: string) =>
      path === "/api/payments/orders/{reference}/"
        ? respond(200, order({ kind: "event", total: 5000, status }))
        : respond(200, NETWORKS),
    );
    render(<EventOrderPayment orderReference="CMD-EVT" countries={COUNTRIES} success={<p>ok</p>} />);
    expect(await screen.findByText(text)).toHaveAttribute("role", "status");
    expect(screen.queryByRole("button", { name: /^Payer/ })).toBeNull();
    expect(screen.queryByText(/Place réservée/)).toBeNull();
  });
});

describe("EventSignupForm (WPD12)", () => {
  const KIDS = [child(), child({ id: 8, firstName: "Noé" })];

  it("événement payant : enfant requis, puis réservation et paiement", async () => {
    const user = userEvent.setup();
    POST.mockImplementation(async (path: string) =>
      path === "/api/events/{slug}/applications/"
        ? respond(201, application({ status: "pending_payment", orderReference: "CMD-EVT" }))
        : respond(201, payment()),
    );
    const { container } = render(
      <EventSignupForm event={event()} kids={KIDS} countries={COUNTRIES} preferred={PREFERRED} />,
    );
    expect(screen.getByText(/Participation : 5\s000\sF\sCFA/)).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
    await user.click(screen.getByRole("button", { name: "Continuer" }));
    expect(await screen.findByRole("link", { name: "Choisissez l'enfant à inscrire." })).toBeInTheDocument();
    expect(POST).not.toHaveBeenCalled();

    await user.selectOptions(screen.getByRole("combobox", { name: /^Enfant/ }), "8");
    await user.type(screen.getByRole("textbox", { name: /Motivation/ }), "  Il adore les robots. ");
    await user.click(screen.getByRole("button", { name: "Continuer" }));
    expect(POST).toHaveBeenCalledWith("/api/events/{slug}/applications/", {
      params: { path: { slug: "defi-robots" } },
      body: { childId: 8, motivation: "Il adore les robots.", selfLevel: "" },
    });
    await screen.findByRole("radio", { name: "MTN Mobile Money" });
    await user.click(screen.getByRole("button", { name: /^Payer 5\s000/ }));
    expect(await screen.findByText(/La participation de Noé à/)).toBeInTheDocument();
  });

  it("événement gratuit, un seul enfant présélectionné : inscription confirmée", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValue(respond(201, application({ status: "accepted" })));
    render(<EventSignupForm event={event({ price: 0 })} kids={[child()]} countries={COUNTRIES} />);
    expect(screen.getByRole("combobox", { name: /^Enfant/ })).toHaveValue("7");
    expect(screen.getByText(/Participation gratuite/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirmer l'inscription" }));
    expect(await screen.findByRole("heading", { name: "Inscription confirmée" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir les événements" })).toHaveAttribute("href", "/parent/evenements");
  });

  it("`EVENT_FULL`, `EVENT_CLOSED`, `ALREADY_APPLIED` affichés", async () => {
    const user = userEvent.setup();
    render(<EventSignupForm event={event()} kids={[child()]} countries={COUNTRIES} />);
    for (const [code, text] of [
      ["EVENT_FULL", /complet/],
      ["EVENT_CLOSED", /closes/],
      ["ALREADY_APPLIED", /déjà inscrit/],
    ] as const) {
      POST.mockResolvedValueOnce(failure(409, code));
      await user.click(screen.getByRole("button", { name: "Continuer" }));
      await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(text));
    }
  });
});

describe("pages serveur des événements du parent", () => {
  it("WPD06 : candidatures (mise en avant) et événements à venir", async () => {
    getUpcomingEvents.mockResolvedValue([event(), event({ slug: "complet", title: "Complet", seatsLeft: 0 })]);
    getMyApplications.mockResolvedValue([application()]);
    serverGET.mockResolvedValue(respond(200, { mobileMoney: null }));
    const { container } = render(
      (await ParentEventsHome({ searchParams: Promise.resolve({ candidature: "4" }) })) as ReactElement,
    );
    expect(screen.getByRole("article", { name: "Défi robots de Cotonou" })).toHaveFocus();
    expect(screen.getByRole("link", { name: /^Inscrire un enfant\s*à Défi robots de Cotonou$/ })).toHaveAttribute(
      "href",
      "/parent/evenements/defi-robots/inscription",
    );
    expect(screen.getAllByText("Complet").length).toBeGreaterThan(0);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("WPD06 : un nouveau statut relu par `router.refresh()` remplace la copie de la ligne", async () => {
    getUpcomingEvents.mockResolvedValue([]);
    getMyApplications.mockResolvedValue([application()]);
    serverGET.mockResolvedValue(respond(200, { mobileMoney: null }));
    const view = render((await ParentEventsHome({ searchParams: Promise.resolve({}) })) as ReactElement);
    expect(screen.getByText("À examiner")).toBeInTheDocument();
    getMyApplications.mockResolvedValue([application({ status: "accepted" })]);
    view.rerender((await ParentEventsHome({ searchParams: Promise.resolve({}) })) as ReactElement);
    expect(screen.getByText("Acceptée")).toBeInTheDocument();
    expect(screen.queryByText("À examiner")).toBeNull();
  });

  it("WPD06 : états vides ; session perdue", async () => {
    getUpcomingEvents.mockResolvedValue([]);
    getMyApplications.mockResolvedValue([]);
    serverGET.mockResolvedValue(respond(200, { mobileMoney: null }));
    render((await ParentEventsHome({ searchParams: Promise.resolve({}) })) as ReactElement);
    expect(screen.getByText("Aucune candidature")).toBeInTheDocument();
    expect(screen.getByText("Aucun événement à venir")).toBeInTheDocument();
    serverGET.mockResolvedValue(respond(401));
    expect(await ParentEventsHome({ searchParams: Promise.resolve({}) })).toBeNull();
  });

  it("highlightedApplication", () => {
    expect(highlightedApplication({ candidature: ["12"] })).toBe(12);
    expect(highlightedApplication({ candidature: "x" })).toBeNull();
    expect(highlightedApplication({})).toBeNull();
  });

  it("WL23 : fiche dans le shell, « Inscrire un enfant » ou le motif ; inconnu → introuvable", async () => {
    getEvent.mockResolvedValue(event());
    render((await ParentEventView({ params: Promise.resolve({ slug: "defi-robots" }) })) as ReactElement);
    expect(screen.getByRole("heading", { level: 2, name: "Défi robots de Cotonou" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Inscrire un enfant" })).toHaveAttribute(
      "href",
      "/parent/evenements/defi-robots/inscription",
    );
    render(<ParentEventAction event={event({ seatsLeft: 0 })} />);
    expect(screen.getByRole("button", { name: "Complet" })).toBeDisabled();
    expect(parentEventBreadcrumb(event(), "Inscrire un enfant")[1]).toEqual({
      label: "Défi robots de Cotonou",
      href: "/parent/evenements/defi-robots",
    });
    getEvent.mockResolvedValue(null);
    await expect(ParentEventView({ params: Promise.resolve({ slug: "x" }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("WPD12 : enfants actifs seulement, motif d'un événement clos, sans enfant actif → « Ajouter un enfant »", async () => {
    getEvent.mockResolvedValue(event());
    serverGET.mockImplementation(async (path: string) =>
      path === "/api/accounts/children/"
        ? respond(200, { results: [child(), child({ id: 9, firstName: "Ama", status: "deactivated" })] })
        : respond(200, { mobileMoney: null }),
    );
    const { unmount } = render((await EventSignup({ params: Promise.resolve({ slug: "defi-robots" }) })) as ReactElement);
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Choisissez l'enfant",
      "Léa Adjovi",
    ]);
    unmount();

    getEvent.mockResolvedValue(event({ seatsLeft: 0 }));
    const closed = render((await EventSignup({ params: Promise.resolve({ slug: "defi-robots" }) })) as ReactElement);
    expect(screen.getByRole("status")).toHaveTextContent("Toutes les places sont prises.");
    closed.unmount();

    getEvent.mockResolvedValue(event());
    serverGET.mockImplementation(async (path: string) =>
      path === "/api/accounts/children/" ? respond(200, {}) : respond(200, { mobileMoney: null }),
    );
    render((await EventSignup({ params: Promise.resolve({ slug: "defi-robots" }) })) as ReactElement);
    expect(screen.getByRole("link", { name: "Ajouter un enfant" })).toHaveAttribute("href", "/parent/enfants/ajouter");
  });

  it("WPD12 : événement inconnu → introuvable ; session perdue → rien", async () => {
    getEvent.mockResolvedValue(null);
    await expect(EventSignup({ params: Promise.resolve({ slug: "x" }) })).rejects.toThrow("NEXT_NOT_FOUND");
    getEvent.mockResolvedValue(event());
    serverGET.mockResolvedValue(respond(401));
    expect(await EventSignup({ params: Promise.resolve({ slug: "defi-robots" }) })).toBeNull();
  });

  it("squelettes", () => {
    render(<ParentEventsHomeSkeleton />);
    render(<EventSignupSkeleton />);
    expect(screen.getAllByRole("status")).toHaveLength(2);
  });
});
