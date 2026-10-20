import type { Schemas } from "@steamy/api-client";
import { render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";
import { childDetail, enrollment } from "@/test/parent-fixtures";

const { GET } = vi.hoisted(() => ({ GET: vi.fn() }));
vi.mock("@/lib/api", () => ({ getServerApi: async () => ({ GET }) }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const { WeeklyReport, WeeklyReportSkeleton, WeeklyReportView, WeeklyEmailNotice, parseWeek } = await import(
  "./WeeklyReport"
);

const respond = (status: number, data?: unknown) => ({ data, response: new Response(null, { status }) });
const CHILD = { id: 7, firstName: "Léa", lastName: "Adjovi" };
const DAYS = ["19", "20", "21", "22", "23", "24", "25"].map((day, index) => ({
  date: `2026-10-${day}`,
  seconds: index === 1 ? 1500 : 0,
}));

function report(overrides: Partial<Schemas["WeeklyReport"]> = {}): Schemas["WeeklyReport"] {
  return {
    week: "2026-W43",
    startDate: "2026-10-19",
    endDate: "2026-10-25",
    previousWeek: "2026-W42",
    nextWeek: null,
    seconds: 1500,
    missionsCompleted: 3,
    quizzesPassed: 1,
    days: DAYS,
    courses: [enrollment()],
    email: "marie@example.com",
    ...overrides,
  };
}

beforeEach(() => GET.mockReset());

describe("WeeklyReportView (WPD11)", () => {
  it("semaine, chiffres du serveur, histogramme accessible, parcours et email d'envoi", async () => {
    const { container } = render(<WeeklyReportView child={CHILD} report={report()} />);
    expect(screen.getByRole("heading", { level: 2, name: "Semaine du 19 octobre 2026 au 25 octobre 2026" })).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Semaines" });
    expect(within(nav).getByRole("link", { name: "Semaine précédente" })).toHaveAttribute(
      "href",
      "/parent/enfants/7/rapport?semaine=2026-W42",
    );
    // Semaine en cours : pas de semaine suivante
    expect(within(nav).queryByRole("link", { name: "Semaine suivante" })).toBeNull();
    expect(within(nav).getByText("Semaine suivante")).toHaveAttribute("aria-disabled", "true");
    // Pastilles (`dt` / `dd`) : valeur servie par l'API sous chaque libellé
    const stat = (label: string) => screen.getAllByText(label).find((element) => element.tagName === "DT")?.nextElementSibling;
    expect(stat("Temps d'apprentissage")).toHaveTextContent("25 min");
    expect(stat("Missions terminées")).toHaveTextContent("3");
    expect(stat("Quiz réussis")).toHaveTextContent("1");
    expect(screen.getByRole("table", { name: "Temps d'apprentissage de Léa, jour par jour" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Progression des parcours" })).toBeInTheDocument();
    expect(screen.getByText(/Ce rapport vous est envoyé chaque semaine à/)).toHaveTextContent("marie@example.com");
    expect(screen.queryByRole("button", { name: /Envoyer/ })).toBeNull();
    expect(screen.getByRole("link", { name: "Léa Adjovi" })).toHaveAttribute("href", "/parent/enfants/7");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("semaine vide : message au lieu de l'histogramme ; semaine passée : « Semaine suivante » en lien", () => {
    render(
      <WeeklyReportView
        child={CHILD}
        report={report({
          seconds: 0,
          missionsCompleted: 0,
          quizzesPassed: 0,
          days: DAYS.map((day) => ({ ...day, seconds: 0 })),
          previousWeek: null,
          nextWeek: "2026-W44",
          courses: [],
        })}
      />,
    );
    expect(screen.getByText(/Aucune activité cette semaine : Léa n'a pas encore travaillé sur Steamy\./)).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByRole("link", { name: "Semaine suivante" })).toHaveAttribute(
      "href",
      "/parent/enfants/7/rapport?semaine=2026-W44",
    );
    expect(screen.getByText("Semaine précédente")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText("Aucun parcours commencé pour l'instant.")).toBeInTheDocument();
  });

  it("sans email : « Ajouter un email » vers WPD08", () => {
    render(<WeeklyEmailNotice email={null} />);
    expect(screen.getByRole("link", { name: "Ajouter un email" })).toHaveAttribute("href", "/parent/parametres");
    expect(screen.queryByText(/vous est envoyé/)).toBeNull();
  });
});

describe("WeeklyReport (WPD11, serveur)", () => {
  const params = (id = "7") => Promise.resolve({ id });

  function routeApi(child: unknown, ...reports: unknown[]) {
    const queue = [...reports];
    GET.mockImplementation(async (path: string) =>
      path === "/api/accounts/children/{id}/" ? child : (queue.length > 1 ? queue.shift() : queue[0]),
    );
  }

  it("lit la semaine dans l'URL", () => {
    expect(parseWeek("2026-W42")).toBe("2026-W42");
    expect(parseWeek(["2026-W42"])).toBe("2026-W42");
    expect(parseWeek("semaine")).toBeUndefined();
    expect(parseWeek(undefined)).toBeUndefined();
  });

  it("semaine demandée transmise à l'API ; illisible : semaine en cours", async () => {
    routeApi(respond(200, childDetail()), respond(200, report({ week: "2026-W42" })));
    const tree = (await WeeklyReport({ params: params(), searchParams: Promise.resolve({ semaine: "2026-W42" }) })) as ReactElement<
      Parameters<typeof WeeklyReportView>[0]
    >;
    expect(tree.props.report.week).toBe("2026-W42");
    expect(tree.props.child.id).toBe(7);
    expect(GET).toHaveBeenCalledWith("/api/accounts/children/{id}/weekly-report/", {
      params: { path: { id: "7" }, query: { week: "2026-W42" } },
    });
    GET.mockClear();
    await WeeklyReport({ params: params(), searchParams: Promise.resolve({ semaine: "x" }) });
    expect(GET).toHaveBeenCalledWith("/api/accounts/children/{id}/weekly-report/", { params: { path: { id: "7" }, query: {} } });
  });

  it("semaine refusée par l'API : semaine en cours", async () => {
    routeApi(respond(200, childDetail()), respond(400), respond(200, report()));
    const tree = (await WeeklyReport({ params: params(), searchParams: Promise.resolve({ semaine: "2099-W60" }) })) as ReactElement<
      Parameters<typeof WeeklyReportView>[0]
    >;
    expect(tree.props.report.week).toBe("2026-W43");
    expect(GET).toHaveBeenLastCalledWith("/api/accounts/children/{id}/weekly-report/", { params: { path: { id: "7" }, query: {} } });
  });

  it("enfant d'un autre parent → introuvable ; session perdue → rien ; squelette", async () => {
    routeApi(respond(404), respond(404));
    await expect(WeeklyReport({ params: params(), searchParams: Promise.resolve({}) })).rejects.toThrow("NEXT_NOT_FOUND");
    routeApi(respond(401), respond(401));
    expect(await WeeklyReport({ params: params(), searchParams: Promise.resolve({}) })).toBeNull();
    routeApi(respond(200, childDetail()), respond(401));
    expect(await WeeklyReport({ params: params(), searchParams: Promise.resolve({}) })).toBeNull();
    render(<WeeklyReportSkeleton />);
    expect(screen.getByRole("status", { name: "Chargement du rapport hebdomadaire…" })).toBeInTheDocument();
  });
});
