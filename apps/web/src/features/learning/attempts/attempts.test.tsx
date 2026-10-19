import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { COURSE } from "@/test/api-fixtures";
import { attemptDetail, attemptListItem, failure, ok, progress } from "@/test/learning-fixtures";

const GET = vi.fn();
vi.mock("@/lib/api", () => ({ getServerApi: async () => ({ GET }) }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("notFound");
  },
}));

const { AttemptsList, AttemptsSkeleton, attemptsHref } = await import("./AttemptsList");
const { AttemptDetail } = await import("./AttemptDetail");
const { ProgressSkeleton, ProgressView, formatSeconds, toActivityDays } = await import("../progress/ProgressView");
const { default: AttemptsPage } = await import("@/app/(apprenant)/apprenant/(shell)/quiz/page");
const { default: AttemptPage } = await import("@/app/(apprenant)/apprenant/(shell)/quiz/[attemptId]/page");
const { default: ProgressPage } = await import("@/app/(apprenant)/apprenant/(shell)/profil/progression/page");

const SUMMARY = { attemptCount: 12, successRate: 75, perfectCount: 4, streakDays: 5 };

beforeEach(() => GET.mockReset());

describe("AttemptsList (WD07 / WD09)", () => {
  it("bandeau de l'API, filtres dans l'URL, lignes vers le détail", async () => {
    GET.mockResolvedValue(ok({ count: 2, next: null, summary: SUMMARY, results: [attemptListItem(), attemptListItem({ id: 10, status: "ko", quiz: { ...attemptListItem().quiz, kind: "summative" } })] }));
    render((await AttemptsList({ status: null, page: 1 })) as ReactElement);
    expect(GET).toHaveBeenCalledWith("/api/learning/attempts/", { params: { query: { page: 1, pageSize: 20 } } });
    expect(screen.getByText("75 %")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("5 j")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tous" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "À refaire" })).toHaveAttribute("href", "/apprenant/quiz?statut=warn");
    expect(screen.getAllByRole("link", { name: /Quiz servo/ })[0]).toHaveAttribute("href", "/apprenant/quiz/9");
    expect(screen.getByText(/Évaluation du projet · 15 oct\. 2026/)).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Pages des tentatives" })).not.toBeInTheDocument();
  });

  it("filtre sans résultat, pagination", async () => {
    GET.mockResolvedValue(ok({ count: 0, next: "http://api/x?page=3", summary: SUMMARY, results: [] }));
    render((await AttemptsList({ status: "ko", page: 2 })) as ReactElement);
    expect(GET).toHaveBeenCalledWith("/api/learning/attempts/", { params: { query: { page: 2, pageSize: 20, status: "ko" } } });
    expect(screen.getByText("Aucune tentative « Échoué » pour l'instant.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "‹ Plus récentes" })).toHaveAttribute("href", "/apprenant/quiz?statut=ko");
    expect(screen.getByRole("link", { name: "Plus anciennes ›" })).toHaveAttribute("href", "/apprenant/quiz?statut=ko&page=3");
  });

  it("première page sans suite, page suivante seule", async () => {
    GET.mockResolvedValue(ok({ count: 30, next: "http://api/x?page=2", summary: SUMMARY }));
    render((await AttemptsList({ status: null, page: 1 })) as ReactElement);
    expect(screen.queryByRole("link", { name: "‹ Plus récentes" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Plus anciennes ›" })).toHaveAttribute("href", "/apprenant/quiz?page=2");
    expect(attemptsHref(null)).toBe("/apprenant/quiz");
  });

  it("WD09 : aucun quiz → mes parcours en cours, sans classement", async () => {
    GET.mockResolvedValue(ok({ count: 0, next: null, summary: { ...SUMMARY, attemptCount: 0 }, results: [] }));
    render((await AttemptsList({ status: null, page: 1 })) as ReactElement);
    expect(screen.getByRole("heading", { name: "Pas encore de quiz" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Voir mes parcours en cours/ })).toHaveAttribute("href", "/apprenant/parcours");
    expect(screen.queryByText(/classement/)).not.toBeInTheDocument();
  });

  it("liste illisible → erreur du segment", async () => {
    GET.mockResolvedValue(failure(500));
    await expect(AttemptsList({ status: null, page: 1 })).rejects.toThrow("Tentatives illisibles");
  });
});

describe("AttemptDetail (WD08)", () => {
  it("résumé de la tentative avec « Voir le parcours », sans badge", async () => {
    GET.mockResolvedValue(ok(attemptDetail()));
    render((await AttemptDetail({ attemptId: 9 })) as ReactElement);
    expect(screen.getByRole("navigation", { name: "Fil d'Ariane" })).toHaveTextContent("Mes quiz");
    expect(screen.getByRole("link", { name: "Voir le parcours" })).toHaveAttribute("href", "/apprenant/parcours/robot-bluetooth");
    expect(screen.queryByRole("link", { name: "Voir mon badge" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Un nouveau badge/)).not.toBeInTheDocument();
  });

  it("tentative refusée → introuvable", async () => {
    GET.mockResolvedValue(failure(403, "NOT_ENROLLED"));
    await expect(AttemptDetail({ attemptId: 9 })).rejects.toThrow("notFound");
  });
});

describe("ProgressView (WD21)", () => {
  it("statistiques de l'API, histogramme, maîtrise, recommandations", async () => {
    GET.mockImplementation(async (path: string) => (path === "/api/learning/progress/" ? ok(progress()) : ok([COURSE])));
    render((await ProgressView()) as ReactElement);
    expect(screen.getByText("1 h 15")).toBeInTheDocument();
    expect(screen.getByText("5 jours")).toBeInTheDocument();
    expect(screen.getByText(/1\s?240/)).toBeInTheDocument();
    expect(screen.getByText("Inventeur")).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Temps d'apprentissage des 7 derniers jours" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "🤖 Robotique" })).toHaveAttribute("aria-valuenow", "30");
    expect(screen.getByText("3/10 missions réussies")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pour aller plus loin" })).toBeInTheDocument();
  });

  it("C8 : points et rang masqués si l'API renvoie null ; sans maîtrise ni recommandation", async () => {
    GET.mockImplementation(async (path: string) =>
      path === "/api/learning/progress/" ? ok(progress({ points: null, rank: null, mastery: [], streakDays: 1 })) : failure(500),
    );
    render((await ProgressView()) as ReactElement);
    expect(screen.queryByText("Points")).not.toBeInTheDocument();
    expect(screen.queryByText("Rang")).not.toBeInTheDocument();
    expect(screen.getByText("1 jour")).toBeInTheDocument();
    expect(screen.getByText(/Commence un parcours/)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Pour aller plus loin" })).not.toBeInTheDocument();
  });

  it("progression illisible → erreur ; formats", async () => {
    GET.mockResolvedValue(failure(500));
    await expect(ProgressView()).rejects.toThrow("Progression illisible");
    expect(formatSeconds(90)).toBe("2 min");
    expect(toActivityDays([{ date: "2026-10-12", seconds: 600 }])).toEqual([
      { label: "lun.", fullLabel: "lundi 12 octobre", seconds: 600, value: "10 min" },
    ]);
  });
});

describe("pages", () => {
  type Boundary = ReactElement<{ children: ReactElement<Record<string, unknown>> }>;

  it("WD07 lit le statut et la page dans l'URL", async () => {
    let tree = (await AttemptsPage({ searchParams: Promise.resolve({ statut: "warn", page: "2" }) } as never)) as Boundary;
    expect(tree.props.children.props).toEqual({ status: "warn", page: 2 });
    tree = (await AttemptsPage({ searchParams: Promise.resolve({ statut: "autre", page: "x" }) } as never)) as Boundary;
    expect(tree.props.children.props).toEqual({ status: null, page: 1 });
  });

  it("WD08 refuse un identifiant invalide ; WD21 sous Suspense", async () => {
    const tree = (await AttemptPage({ params: Promise.resolve({ attemptId: "9" }) } as never)) as Boundary;
    expect(tree.props.children.props).toEqual({ attemptId: 9 });
    await expect(AttemptPage({ params: Promise.resolve({ attemptId: "0" }) } as never)).rejects.toThrow("notFound");
    render(<AttemptsSkeleton />);
    render(<ProgressSkeleton />);
    expect((ProgressPage() as Boundary).props.children.type).toBe(ProgressView);
  });
});
