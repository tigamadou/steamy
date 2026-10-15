import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { course } from "@/test/api-fixtures";
import { axe } from "@/test/axe";

import { dashboard, enrollment } from "./fixtures";

const GET = vi.fn();
const getStarterCourses = vi.fn();
const flags = { events: false, unlock: false };
vi.mock("@/lib/api", () => ({ getServerApi: async () => ({ GET }) }));
vi.mock("@/lib/catalog", () => ({ getStarterCourses: () => getStarterCourses() }));
vi.mock("@/lib/features", () => ({ features: flags }));
// Composant asynchrone (catalogue public) : testé à part, remplacé ici par un marqueur
vi.mock("./StarterSuggestions", () => ({ StarterSuggestions: () => <p>suggestions</p> }));

const { Dashboard, coursesLabel, daysLabel } = await import("./Dashboard");
const { StarterSuggestions } = await vi.importActual<typeof import("./StarterSuggestions")>("./StarterSuggestions");
const { resumeAction } = await import("./ResumeCard");

const respond = (status: number, data?: object) => ({ data, response: new Response(null, { status }) });

async function renderDashboard(data: object) {
  GET.mockResolvedValue(respond(200, data));
  return render((await Dashboard())!);
}

describe("Dashboard (WD01)", () => {
  beforeEach(() => {
    GET.mockReset();
    flags.events = false;
  });

  it("reprend le parcours en cours, affiche streak, points et rang tels que l'API les renvoie", async () => {
    const { container } = await renderDashboard(dashboard());
    expect(GET).toHaveBeenCalledWith("/api/learning/dashboard/");
    const resume = screen.getByRole("region", { name: "Construis ton robot Bluetooth" });
    expect(within(resume).getByText("En cours · Le châssis · Les moteurs")).toBeInTheDocument();
    expect(within(resume).getByText("Prochaine mission : Brancher le moteur")).toBeInTheDocument();
    expect(within(resume).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "62");
    expect(within(resume).getByRole("link", { name: "Continuer la mission" })).toHaveAttribute(
      "href",
      "/apprenant/parcours/robot-bluetooth/missions/31",
    );
    const stats = screen.getByRole("region", { name: "Tes statistiques" });
    expect(within(stats).getAllByRole("term").map((t) => t.textContent)).toEqual(["Streak", "Points", "Rang"]);
    expect(within(stats).getAllByRole("definition").map((d) => d.textContent?.replace(/\s/g, " "))).toEqual([
      "5 jours",
      "1 240",
      "Inventeur",
    ]);
    expect(screen.queryByText("Niveau")).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("sans points ni rang (barème C8 non fixé), seules les pastilles renvoyées sont affichées", async () => {
    await renderDashboard(dashboard({ points: null, rank: null, streakDays: 1 }));
    const stats = screen.getByRole("region", { name: "Tes statistiques" });
    expect(within(stats).getAllByRole("term").map((t) => t.textContent)).toEqual(["Streak"]);
    expect(within(stats).getByText("1 jour")).toBeInTheDocument();
  });

  it("raccourcis : catalogue, souhaits (compteur de l'API), quiz ; Steamy Events absent tant que le drapeau est baissé", async () => {
    await renderDashboard(dashboard());
    const nav = screen.getByRole("navigation", { name: "Raccourcis" });
    expect(within(nav).getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual([
      "/apprenant/catalogue",
      "/apprenant/souhaits",
      "/apprenant/quiz",
    ]);
    expect(within(nav).getByText("2 parcours")).toBeInTheDocument();
    expect(screen.queryByText(/Bientôt/)).toBeNull();
  });

  it("affiche le raccourci Steamy Events quand le drapeau `events` est levé", async () => {
    flags.events = true;
    await renderDashboard(dashboard());
    expect(screen.getByRole("link", { name: /Steamy Events/ })).toHaveAttribute("href", "/apprenant/evenements");
  });

  it("« Pour toi » : recommandations de l'API vers la fiche de l'espace apprenant, « Voir tout » vers le catalogue", async () => {
    await renderDashboard(dashboard());
    const section = screen.getByRole("region", { name: /Pour toi/ });
    expect(within(section).getByRole("link", { name: "L'IA pour les débutants" })).toHaveAttribute(
      "href",
      "/apprenant/catalogue/ia",
    );
    expect(within(section).getByRole("link", { name: "Voir tout" })).toHaveAttribute("href", "/apprenant/catalogue");
  });

  it("sans recommandation, invite à revenir au catalogue", async () => {
    await renderDashboard(dashboard({ recommendations: [] }));
    expect(screen.getByText(/Tu suis déjà tous nos parcours publiés/)).toBeInTheDocument();
  });

  it("ne rend rien sans session (la garde de rôle redirige) et propage les autres erreurs", async () => {
    GET.mockResolvedValue(respond(401));
    expect(await Dashboard()).toBeNull();
    GET.mockResolvedValue(respond(500));
    await expect(Dashboard()).rejects.toThrow("Réponse inattendue de l'API (500)");
  });
});

describe("Dashboard (WD02)", () => {
  it("sans parcours à reprendre : bienvenue, catalogue gratuit et suggestions", async () => {
    const { container } = await renderDashboard(
      dashboard({ resume: null, counters: { ...dashboard().counters, completedEnrollments: 0 } }),
    );
    expect(screen.getByRole("heading", { level: 2, name: "Bienvenue Léa !" })).toBeInTheDocument();
    expect(screen.getByText(/Tu n'as pas encore commencé de parcours/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Explorer le catalogue" })).toHaveAttribute(
      "href",
      "/apprenant/catalogue?prix=gratuit",
    );
    const suggestions = screen.getByRole("region", { name: /Suggestions pour bien démarrer/ });
    expect(within(suggestions).getByRole("link", { name: "Voir tout" })).toHaveAttribute(
      "href",
      "/apprenant/catalogue?prix=gratuit",
    );
    expect(within(suggestions).getByText("suggestions")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Tes statistiques" })).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("après des parcours terminés, félicite au lieu d'accueillir", async () => {
    await renderDashboard(dashboard({ resume: null }));
    expect(screen.getByRole("heading", { level: 2, name: "Bravo Léa !" })).toBeInTheDocument();
    expect(screen.getByText(/Tu as terminé tous tes parcours en cours/)).toBeInTheDocument();
  });
});

describe("StarterSuggestions", () => {
  it("trois parcours gratuits débutant vers leur fiche de l'espace apprenant", async () => {
    getStarterCourses.mockResolvedValue([course({ slug: "scratch", title: "Initiation à Scratch" })]);
    render(await StarterSuggestions());
    expect(screen.getByRole("link", { name: "Initiation à Scratch" })).toHaveAttribute(
      "href",
      "/apprenant/catalogue/scratch",
    );
    expect(screen.getByText("Gratuit")).toBeInTheDocument();
  });

  it("aucun parcours : renvoie vers le catalogue", async () => {
    getStarterCourses.mockResolvedValue([]);
    render(await StarterSuggestions());
    expect(screen.getByText(/Aucun parcours gratuit pour débutant/)).toBeInTheDocument();
  });
});

describe("libellés et reprise", () => {
  it("accorde jours et parcours", () => {
    expect([0, 1, 2].map(daysLabel)).toEqual(["0 jour", "1 jour", "2 jours"]);
    expect([0, 1, 3].map(coursesLabel)).toEqual(["Aucun parcours", "1 parcours", "3 parcours"]);
  });

  it("suit l'étape suivante renvoyée par l'API : mission, quiz, certification ou parcours", () => {
    const next = enrollment().next;
    expect(resumeAction({ ...next, type: "quiz", id: 7 })).toEqual({
      href: "/apprenant/parcours/robot-bluetooth/quiz/7",
      label: "Passer le quiz",
    });
    expect(resumeAction({ ...next, type: "certification", id: null })).toEqual({
      href: "/apprenant/parcours/robot-bluetooth/certification",
      label: "Voir ma certification",
    });
    expect(resumeAction({ ...next, id: null })).toEqual({
      href: "/apprenant/parcours/robot-bluetooth",
      label: "Voir mon parcours",
    });
  });

  it("carte de reprise d'un quiz, sans projet ni niveau en cours", async () => {
    await renderDashboard(
      dashboard({
        resume: enrollment({
          currentProject: null,
          currentLevel: null,
          next: { ...enrollment().next, type: "quiz", id: 7, title: "Quiz du châssis" },
        }),
      }),
    );
    expect(screen.getByText(/^En cours$/)).toBeInTheDocument();
    expect(screen.getByText("Prochain quiz : Quiz du châssis")).toBeInTheDocument();
  });

  it("certification : ni prochaine étape ni titre", async () => {
    await renderDashboard(
      dashboard({ resume: enrollment({ next: { ...enrollment().next, type: "certification", id: null, title: null } }) }),
    );
    expect(screen.queryByText(/Prochaine mission/)).toBeNull();
    expect(screen.getByRole("link", { name: "Voir ma certification" })).toBeInTheDocument();
  });
});
