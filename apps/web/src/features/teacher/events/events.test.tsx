import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";
import { steamyEvent } from "@/test/api-fixtures";
import { classroom, eventApplication } from "@/test/teacher-fixtures";

const GET = vi.fn();
const POST = vi.fn();
const getUpcomingEvents = vi.fn();
const getEvent = vi.fn();
vi.mock("@/lib/api", () => ({ getServerApi: async () => ({ GET }) }));
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ POST }) }));
vi.mock("@/features/events/api", () => ({
  getUpcomingEvents: () => getUpcomingEvents(),
  getEvent: (slug: string) => getEvent(slug),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const { APPLICATIONS_PAGE_SIZE, getEventApplications } = await import("./api");
const { ProposeButton } = await import("./ProposeButton");
const { ApplicationLine, TEACHER_APPLICATION_STATUS, TeacherEventsHome, TeacherEventsHomeSkeleton, TeacherEventsView } = await import(
  "./TeacherEventsHome"
);
const { TeacherEventView, teacherEventBreadcrumb } = await import("./TeacherEventView");

const respond = (status: number, data?: unknown) => ({ data, response: new Response(null, { status }) });
const failure = (status: number, code: string, message = "") => ({
  error: { code, message },
  response: new Response(null, { status }),
});
const CLASSROOMS = [classroom(), classroom({ id: 4, name: "3ᵉ A · Code" })];

beforeEach(() => {
  GET.mockReset();
  POST.mockReset();
  getUpcomingEvents.mockReset();
  getEvent.mockReset();
});

describe("getEventApplications", () => {
  it("candidatures de mes élèves, en lecture seule", async () => {
    GET.mockResolvedValue(respond(200, { results: [eventApplication()] }));
    expect(await getEventApplications()).toEqual([eventApplication()]);
    expect(GET).toHaveBeenCalledWith("/api/classrooms/event-applications/", {
      params: { query: { pageSize: APPLICATIONS_PAGE_SIZE } },
    });
    GET.mockResolvedValue(respond(200, {}));
    expect(await getEventApplications()).toEqual([]);
    GET.mockResolvedValue(respond(401));
    expect(await getEventApplications()).toBeNull();
  });
});

describe("ProposeButton", () => {
  const renderButton = () => render(<ProposeButton eventSlug="defi-robots" eventTitle="Défi robots" classrooms={CLASSROOMS} />);

  async function open(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole("button", { name: /Proposer à une classe/ }));
    return screen.getByRole("dialog");
  }

  it("sans classe : bouton désactivé qui renvoie à la création d'une classe", () => {
    render(<ProposeButton eventSlug="defi-robots" eventTitle="Défi robots" classrooms={[]} />);
    const button = screen.getByRole("button", { name: /Proposer à une classe/ });
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription(/Créez d'abord une classe/);
  });

  it("choix de la classe, puis confirmation « Les élèves et leurs parents ont été notifiés »", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValue({ data: { id: 1, event: "defi-robots", classroomId: 4, notifiedCount: 6 }, response: new Response(null, { status: 201 }) });
    const { baseElement } = renderButton();
    const dialog = await open(user);
    expect(dialog).toHaveTextContent(/Chaque élève candidate ensuite seul, avec l'accord de son parent/);
    await user.selectOptions(within(dialog).getByRole("combobox", { name: /Classe/ }), "4");
    await user.click(within(dialog).getByRole("button", { name: "Envoyer la proposition" }));
    await waitFor(() =>
      expect(POST).toHaveBeenCalledWith("/api/events/{slug}/proposals/", {
        params: { path: { slug: "defi-robots" } },
        body: { classroomId: 4 },
      }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent("Les élèves et leurs parents ont été notifiés (6 notifications).");
    expect(await axe(baseElement)).toHaveNoViolations();
    await user.click(screen.getByRole("button", { name: "Terminer" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    // Rouvrir : le choix est de nouveau possible
    expect(within(await open(user)).getByRole("button", { name: "Envoyer la proposition" })).toBeInTheDocument();
  });

  it("une seule notification : singulier", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValue({ data: { id: 1, event: "e", classroomId: 3, notifiedCount: 1 }, response: new Response(null, { status: 201 }) });
    renderButton();
    const dialog = await open(user);
    await user.selectOptions(within(dialog).getByRole("combobox", { name: /Classe/ }), "3");
    await user.click(within(dialog).getByRole("button", { name: "Envoyer la proposition" }));
    expect(await screen.findByRole("status")).toHaveTextContent("(1 notification)");
  });

  it("aucune classe choisie : erreur, aucun appel", async () => {
    const user = userEvent.setup();
    renderButton();
    const dialog = await open(user);
    await user.click(within(dialog).getByRole("button", { name: "Envoyer la proposition" }));
    expect((await within(dialog).findAllByText("Choisissez une classe.")).length).toBeGreaterThan(0);
    expect(POST).not.toHaveBeenCalled();
  });

  it("seconde proposition à la même classe : le message du serveur reste affiché, réessai possible, annuler l'efface", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValueOnce(failure(400, "EVENT_ALREADY_PROPOSED", "Cet événement a déjà été proposé à cette classe."));
    renderButton();
    const dialog = await open(user);
    await user.selectOptions(within(dialog).getByRole("combobox", { name: /Classe/ }), "3");
    await user.click(within(dialog).getByRole("button", { name: "Envoyer la proposition" }));
    expect((await within(dialog).findAllByText("Cet événement a déjà été proposé à cette classe.")).length).toBeGreaterThan(0);
    await user.selectOptions(within(dialog).getByRole("combobox", { name: /Classe/ }), "4");
    POST.mockResolvedValueOnce({ data: { id: 2, event: "e", classroomId: 4, notifiedCount: 3 }, response: new Response(null, { status: 201 }) });
    await user.click(within(dialog).getByRole("button", { name: "Envoyer la proposition" }));
    expect(await screen.findByRole("status")).toBeInTheDocument();
    expect(POST).toHaveBeenCalledTimes(2);
  });

  it("annuler ferme la fenêtre sans rien envoyer", async () => {
    const user = userEvent.setup();
    renderButton();
    const dialog = await open(user);
    await user.click(within(dialog).getByRole("button", { name: "Annuler" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(POST).not.toHaveBeenCalled();
  });

  it("un double clic n'envoie qu'une proposition", async () => {
    const user = userEvent.setup();
    let finish: (value: unknown) => void = () => {};
    POST.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    renderButton();
    const dialog = await open(user);
    await user.selectOptions(within(dialog).getByRole("combobox", { name: /Classe/ }), "3");
    await user.dblClick(within(dialog).getByRole("button", { name: "Envoyer la proposition" }));
    expect(POST).toHaveBeenCalledTimes(1);
    await act(async () => finish({ data: { id: 1, event: "e", classroomId: 3, notifiedCount: 2 }, response: new Response(null, { status: 201 }) }));
  });
});

describe("WT09 · Steamy Events", () => {
  const events = [steamyEvent(), steamyEvent({ slug: "atelier", title: "Atelier Scratch" })];

  it("libellés de statut au vouvoiement", () => {
    expect(TEACHER_APPLICATION_STATUS.pending_parent.label).toBe("En attente du parent");
    expect(Object.values(TEACHER_APPLICATION_STATUS).map((entry) => entry.label).join(" ")).not.toMatch(/\bton\b|\bta\b|\btes\b/);
  });

  it("événements à venir avec « Proposer à une classe », candidatures de mes élèves en lecture seule", async () => {
    const { container } = render(
      <TeacherEventsView events={events} classrooms={CLASSROOMS} applications={[eventApplication(), eventApplication({ id: 9, status: "accepted" })]} />,
    );
    expect(screen.getAllByRole("button", { name: /Proposer à une classe/ })).toHaveLength(2);
    expect(screen.getByRole("link", { name: events[0].title })).toHaveAttribute("href", `/enseignant/evenements/${events[0].slug}`);
    const lines = within(screen.getByRole("list", { name: "Candidatures de mes élèves" }));
    expect(lines.getAllByRole("listitem")).toHaveLength(2);
    expect(lines.getByText("En attente du parent")).toBeInTheDocument();
    expect(lines.getByText("Acceptée")).toBeInTheDocument();
    expect(screen.getAllByText(/Yao Kpadé · 4ᵉ B · Robotique/)).toHaveLength(2);
    // Lecture seule : ni « Accepter » ni « Refuser »
    expect(screen.queryByRole("button", { name: /Accepter|Refuser/ })).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("états vides", () => {
    render(<TeacherEventsView events={[]} classrooms={CLASSROOMS} applications={[]} />);
    expect(screen.getByText("Aucun événement à venir")).toBeInTheDocument();
    expect(screen.getByText("Aucune candidature")).toBeInTheDocument();
  });

  it("ligne de candidature", () => {
    render(<ApplicationLine application={eventApplication({ learner: { ...eventApplication().learner, avatar: null } })} />);
    expect(screen.getByText(/Défi robots de Cotonou · candidature du 21 octobre 2026/)).toBeInTheDocument();
  });

  it("serveur : lit événements, classes et candidatures ; sans session rien", async () => {
    getUpcomingEvents.mockResolvedValue(events);
    GET.mockImplementation(async (path: string) =>
      path.includes("event-applications") ? respond(200, { results: [eventApplication()] }) : respond(200, { results: CLASSROOMS }),
    );
    render(await TeacherEventsHome());
    expect(screen.getByRole("list", { name: "Candidatures de mes élèves" })).toBeInTheDocument();
    GET.mockResolvedValue(respond(401));
    expect(await TeacherEventsHome()).toBeNull();
  });

  it("squelette accessible", async () => {
    const { container } = render(<TeacherEventsHomeSkeleton />);
    expect(screen.getByRole("status", { name: "Chargement des événements…" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("WL23 dans le shell enseignant", () => {
  it("fil d'Ariane et fiche avec « Proposer à une classe »", async () => {
    const event = steamyEvent();
    getEvent.mockResolvedValue(event);
    GET.mockResolvedValue(respond(200, { results: CLASSROOMS }));
    expect(teacherEventBreadcrumb(event)).toEqual([{ label: "Steamy Events", href: "/enseignant/evenements" }, { label: event.title }]);
    render(await TeacherEventView({ params: Promise.resolve({ slug: event.slug }) }));
    expect(screen.getByRole("heading", { level: 2, name: event.title })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Proposer à une classe/ })).toBeEnabled();
  });

  it("événement inconnu : introuvable ; sans session : rien", async () => {
    getEvent.mockResolvedValue(null);
    GET.mockResolvedValue(respond(200, { results: CLASSROOMS }));
    await expect(TeacherEventView({ params: Promise.resolve({ slug: "x" }) })).rejects.toThrow("NEXT_NOT_FOUND");
    getEvent.mockResolvedValue(steamyEvent());
    GET.mockResolvedValue(respond(401));
    expect(await TeacherEventView({ params: Promise.resolve({ slug: "x" }) })).toBeNull();
  });
});
