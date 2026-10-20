import type { Schemas } from "@steamy/api-client";
import { render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { steamyEvent } from "@/test/api-fixtures";
import { axe } from "@/test/axe";
import { application, ticket } from "@/test/events-fixtures";

const GET = vi.fn();
vi.mock("@/lib/api", () => ({ getServerApi: async () => ({ GET }) }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("notFound");
  },
  useRouter: () => ({ push: vi.fn() }),
}));

const { getEvent, getMyApplications, getMyTickets, getUpcomingEvents } = await import("./api");
const { EventsHome, EventsHomeSkeleton } = await import("./EventsHome");
const { LearnerEventAction, LearnerEventView, eventBreadcrumb } = await import("./LearnerEventView");
const { EventApplication, EventApplicationSkeleton } = await import("./EventApplication");
const { activeApplication, closedReason, freeTicket, isFreeEvent } = await import("./status");

const respond = (status: number, data?: unknown) => ({ data, response: new Response(null, { status }) });
const page = <T,>(results: T[], next: string | null = null) => respond(200, { count: results.length, next, results });

type Api = {
  events?: Schemas["SteamyEvent"][];
  event?: Schemas["SteamyEventDetail"] | null;
  applications?: Schemas["Application"][];
  tickets?: Schemas["Ticket"][];
};

function mockApi({ events = [steamyEvent()], event = steamyEvent(), applications = [], tickets = [] }: Api = {}) {
  GET.mockImplementation(async (path: string) => {
    if (path === "/api/events/") return page(events);
    if (path === "/api/events/{slug}/") return event ? respond(200, event) : respond(404);
    if (path === "/api/events/applications/") return page(applications);
    if (path === "/api/events/tickets/") return respond(200, tickets);
    throw new Error(path);
  });
}

const params = (slug = "atelier-electronique") => Promise.resolve({ slug });

beforeEach(() => {
  GET.mockReset();
});

describe("lectures de Steamy Events (api.ts)", () => {
  it("événements à venir, fiche, candidatures sur plusieurs pages, tickets", async () => {
    GET.mockImplementation(async (path: string, init?: { params?: { query?: { page?: number } } }) => {
      if (path === "/api/events/") return respond(200, { count: 0, next: null });
      if (path === "/api/events/{slug}/") return respond(200, steamyEvent());
      if (path === "/api/events/applications/") {
        return init?.params?.query?.page === 1
          ? page([application({ id: 1 })], "page-2")
          : respond(200, { count: 2, next: null });
      }
      return respond(200, [ticket()]);
    });
    expect(await getUpcomingEvents()).toEqual([]);
    expect(GET).toHaveBeenCalledWith("/api/events/", { params: { query: { upcoming: true, pageSize: 50 } } });
    expect(await getEvent("atelier-electronique")).toEqual(steamyEvent());
    expect((await getMyApplications()).map((item) => item.id)).toEqual([1]);
    expect(await getMyTickets()).toEqual([ticket()]);
  });

  it("événement introuvable → null ; toute autre erreur remonte à l'enveloppe d'erreur", async () => {
    GET.mockResolvedValueOnce(respond(404));
    expect(await getEvent("inconnu")).toBeNull();
    GET.mockResolvedValueOnce({ error: { code: "SERVER_ERROR", message: "Panne" }, response: new Response(null, { status: 500 }) });
    await expect(getMyTickets()).rejects.toThrow("Panne");
  });
});

describe("règles d'affichage (status.ts)", () => {
  it("candidature en cours : en attente, à payer ou acceptée ; refusée ou annulée ne bloque pas", () => {
    const slug = "atelier-electronique";
    expect(activeApplication([application({ status: "refused" })], slug)).toBeUndefined();
    expect(activeApplication([application({ status: "cancelled" })], slug)).toBeUndefined();
    expect(activeApplication([application({ status: "pending_payment" })], slug)?.status).toBe("pending_payment");
    expect(activeApplication([application()], "autre")).toBeUndefined();
  });

  it("ticket libre, motif d'un événement fermé, gratuité", () => {
    expect(freeTicket([ticket({ used: true }), ticket({ id: 9 })])?.id).toBe(9);
    expect(freeTicket([ticket({ used: true })])).toBeUndefined();
    expect(closedReason("open")).toBeNull();
    expect(closedReason("full")).toBe("EVENT_FULL");
    expect(closedReason("closed")).toBe("EVENT_CLOSED");
    expect(closedReason("past")).toBe("EVENT_PAST");
    expect(isFreeEvent({ price: 0 })).toBe(true);
    expect(isFreeEvent({})).toBe(true);
    expect(isFreeEvent({ price: 5000 })).toBe(false);
  });
});

describe("EventsHome (WD10)", () => {
  it("événements à venir (prix serveur, « Participer »), candidatures et leurs statuts, ticket libre", async () => {
    mockApi({
      events: [
        steamyEvent(),
        steamyEvent({ slug: "defi-robots", title: "Défi robots", price: 5000, isFree: false, emoji: "" }),
        steamyEvent({ slug: "hackathon", title: "Hackathon", seatsLeft: 0, applicationsOpen: false }),
        steamyEvent({ slug: "fete", title: "Fête", applicationsOpen: false }),
      ],
      applications: [
        application(),
        application({
          id: 2,
          status: "refused",
          refusalReason: "Trop loin.",
          ticketUsed: true,
          event: { ...application().event, slug: "fete", title: "Fête", emoji: "" },
        }),
        application({ id: 3, status: "pending_payment", event: { ...application().event, slug: "a", title: "A" } }),
        application({ id: 4, status: "accepted", event: { ...application().event, slug: "b", title: "B" } }),
        application({ id: 5, status: "cancelled", event: { ...application().event, slug: "c", title: "C" } }),
      ],
      tickets: [ticket()],
    });
    const { container } = render((await EventsHome()) as ReactElement);

    const upcoming = screen.getByRole("region", { name: "Événements à venir" });
    const cards = within(upcoming).getAllByRole("article");
    expect(within(cards[0]).getByRole("link", { name: "Atelier Électronique débutant" })).toHaveAttribute(
      "href",
      "/apprenant/evenements/atelier-electronique",
    );
    expect(within(cards[0]).getByText("Gratuit")).toBeInTheDocument();
    // Déjà candidat : le statut remplace « Participer »
    expect(within(cards[0]).getByText("En attente de ton parent")).toBeInTheDocument();
    expect(within(cards[0]).queryByRole("link", { name: /Participer/ })).not.toBeInTheDocument();
    expect(within(cards[1]).getByText(/5\s000 F CFA/)).toBeInTheDocument();
    expect(within(cards[1]).getByRole("link", { name: "Participer à Défi robots" })).toHaveAttribute(
      "href",
      "/apprenant/evenements/defi-robots/candidature",
    );
    expect(within(cards[2]).getByText("Complet")).toBeInTheDocument();
    // Candidature refusée : une nouvelle candidature reste possible, sauf si l'événement est clos
    expect(within(cards[3]).getByText("Candidatures closes")).toBeInTheDocument();

    const mine = screen.getByRole("list", { name: "Tes candidatures" });
    expect(within(mine).getAllByRole("listitem")).toHaveLength(5);
    for (const label of ["En attente de ton parent", "Refusée", "En attente du paiement", "Acceptée", "Annulée"]) {
      expect(within(mine).getByText(label)).toBeInTheDocument();
    }
    expect(within(mine).getByText("Motif : Trop loin.")).toBeInTheDocument();
    expect(within(mine).getByText(/Ticket Steamy Events utilisé/)).toBeInTheDocument();
    expect(screen.getByText(/ta prochaine candidature à un événement payant est gratuite/)).toBeInTheDocument();
    expect(screen.getByText(/« Construis ton robot Bluetooth »/)).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("états vides : aucun événement, aucune candidature, sans ticket", async () => {
    mockApi({ events: [], tickets: [ticket({ used: true })] });
    render((await EventsHome()) as ReactElement);
    expect(screen.getByText("Aucun événement à venir")).toBeInTheDocument();
    expect(screen.getByText("Pas encore de candidature")).toBeInTheDocument();
    expect(screen.queryByText(/ticket/i)).not.toBeInTheDocument();
  });

  it("squelette verbalisé", () => {
    render(<EventsHomeSkeleton />);
    expect(screen.getByRole("status", { name: "Chargement des événements…" })).toBeInTheDocument();
  });
});

describe("LearnerEventView (WL23 dans le shell)", () => {
  it("fiche du lot 1 en h2, fil d'Ariane du shell, « Demander à participer » → WD11, accord du parent", async () => {
    mockApi();
    const { container } = render((await LearnerEventView({ params: params() })) as ReactElement);
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Atelier Électronique débutant" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Steamy Events" })).toHaveAttribute("href", "/apprenant/evenements");
    expect(screen.getByRole("link", { name: "Demander à participer" })).toHaveAttribute(
      "href",
      "/apprenant/evenements/atelier-electronique/candidature",
    );
    expect(screen.getByText("Ta candidature sera envoyée à ton parent pour accord.")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("événement inconnu → 404", async () => {
    mockApi({ event: null });
    await expect(LearnerEventView({ params: params("inconnu") })).rejects.toThrow("notFound");
  });

  it("déjà candidat : statut et lien vers WD10, sans CTA", () => {
    render(<LearnerEventAction event={steamyEvent()} application={application({ status: "accepted" })} />);
    expect(screen.getByText("Acceptée")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir mes candidatures" })).toHaveAttribute("href", "/apprenant/evenements");
    expect(screen.queryByRole("link", { name: "Demander à participer" })).not.toBeInTheDocument();
  });

  it.each([
    [{ seatsLeft: 0, applicationsOpen: false }, "Complet", "Toutes les places sont prises."],
    [{ applicationsOpen: false }, "Candidatures closes", "La date limite de candidature est passée."],
    [{ isPast: true }, "Événement terminé", "Cet événement a déjà eu lieu."],
  ])("complet, clos ou passé : CTA désactivé avec son motif", (overrides, cta, reason) => {
    render(<LearnerEventAction event={steamyEvent(overrides)} />);
    const button = screen.getByRole("button", { name: cta });
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription(reason);
  });

  it("payant : le parent règle aussi l'inscription", () => {
    render(<LearnerEventAction event={steamyEvent({ price: 5000, isFree: false })} />);
    expect(screen.getByText(/qui réglera aussi l'inscription/)).toBeInTheDocument();
  });

  it("fil d'Ariane jusqu'à la candidature", () => {
    expect(eventBreadcrumb(steamyEvent(), "Candidature")).toEqual([
      { label: "Steamy Events", href: "/apprenant/evenements" },
      { label: "Atelier Électronique débutant", href: "/apprenant/evenements/atelier-electronique" },
      { label: "Candidature" },
    ]);
  });
});

describe("EventApplication (WD11)", () => {
  it("rappel de l'événement, formulaire, accord du parent ; h2 sous le h1 du shell", async () => {
    mockApi({ tickets: [ticket()] });
    const { container } = render((await EventApplication({ params: params() })) as ReactElement);
    expect(screen.getByRole("heading", { level: 2, name: "Atelier Électronique débutant" })).toBeInTheDocument();
    expect(screen.getByText("Gratuit")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Pourquoi veux-tu participer/ })).toBeRequired();
    expect(screen.getByRole("combobox", { name: "Ton expérience en robotique" })).toBeInTheDocument();
    expect(screen.queryByText(/niveau/i)).not.toBeInTheDocument();
    expect(screen.getByText("Ta candidature sera envoyée à ton parent pour accord.")).toBeInTheDocument();
    // Événement gratuit : le ticket n'est pas employé
    expect(screen.queryByText(/ticket/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Atelier Électronique débutant" })).toHaveAttribute(
      "href",
      "/apprenant/evenements/atelier-electronique",
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("payant avec un ticket libre : candidature gratuite, accord du parent seul (C12)", async () => {
    mockApi({ event: steamyEvent({ price: 5000, isFree: false }), tickets: [ticket()] });
    render((await EventApplication({ params: params() })) as ReactElement);
    expect(screen.getByText(/Ton ticket Steamy Events rend cette candidature gratuite/)).toBeInTheDocument();
    expect(screen.getByText("Ta candidature sera envoyée à ton parent pour accord.")).toBeInTheDocument();
  });

  it("payant sans ticket : le parent règle aussi l'inscription", async () => {
    mockApi({ event: steamyEvent({ price: 5000, isFree: false }) });
    render((await EventApplication({ params: params() })) as ReactElement);
    expect(screen.getByText(/qui réglera aussi l'inscription/)).toBeInTheDocument();
  });

  it("déjà candidat : statut à la place du formulaire", async () => {
    mockApi({ applications: [application()] });
    render((await EventApplication({ params: params() })) as ReactElement);
    expect(screen.getByText(/Tu as déjà candidaté à cet événement/)).toBeInTheDocument();
    expect(screen.getByText("En attente de ton parent")).toBeInTheDocument();
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });

  it("complet : motif à la place du formulaire", async () => {
    mockApi({ event: steamyEvent({ seatsLeft: 0, applicationsOpen: false }) });
    render((await EventApplication({ params: params() })) as ReactElement);
    expect(screen.getByText("Toutes les places sont prises.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir les autres événements" })).toHaveAttribute("href", "/apprenant/evenements");
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });

  it("événement inconnu → 404 ; squelette verbalisé", async () => {
    mockApi({ event: null });
    await expect(EventApplication({ params: params("inconnu") })).rejects.toThrow("notFound");
    render(<EventApplicationSkeleton />);
    expect(screen.getByRole("status", { name: "Chargement de la candidature…" })).toBeInTheDocument();
  });
});
