import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";
import { classroom, review } from "@/test/teacher-fixtures";

const GET = vi.fn();
const router = { push: vi.fn() };
const redirect = vi.fn((target: string) => {
  throw new Error(`REDIRECT ${target}`);
});
vi.mock("@/lib/api", () => ({ getServerApi: async () => ({ GET }) }));
vi.mock("next/navigation", () => ({ useRouter: () => router, redirect: (target: string) => redirect(target), notFound: () => undefined }));

const { FILTER_QUERY, parseReviewParams } = await import("./params");
const { ReviewList, EMPTY_TEXTS } = await import("./ReviewList");
const { ClassroomFilter } = await import("./ClassroomFilter");
const { REVIEWS_PAGE_SIZE, TeacherReviews, TeacherReviewsSkeleton } = await import("./TeacherReviews");
const { ReviewRow } = await import("@/features/teacher/home/ReviewRow");

const respond = (status: number, data?: unknown) => ({ data, response: new Response(null, { status }) });
const page = (results: unknown[], extra: object = {}) => respond(200, { count: results.length, next: null, results, ...extra });

beforeEach(() => {
  GET.mockReset();
  router.push.mockReset();
  redirect.mockClear();
});

describe("parseReviewParams", () => {
  it("valeurs valides", () => {
    expect(parseReviewParams({ filtre: "a-revoir", classe: "3", page: "2" })).toEqual({ filter: "a-revoir", classroomId: "3", page: 2 });
    expect(parseReviewParams({ filtre: ["sommatives"] })).toEqual({ filter: "sommatives", classroomId: undefined, page: 1 });
  });

  it("valeurs invalides : « Toutes », toutes les classes, première page", () => {
    expect(parseReviewParams({ filtre: "corriger", classe: "abc", page: "0" })).toEqual({ filter: "toutes", classroomId: undefined, page: 1 });
    expect(parseReviewParams({ page: "x" }).page).toBe(1);
    expect(parseReviewParams({})).toEqual({ filter: "toutes", classroomId: undefined, page: 1 });
  });

  it("chaque filtre a ses paramètres d'API : « À revoir » = non commentées (D65)", () => {
    expect(FILTER_QUERY["a-revoir"]).toEqual({ status: "to_review" });
    expect(FILTER_QUERY.formatives).toEqual({ type: "formative" });
    expect(FILTER_QUERY.sommatives).toEqual({ type: "summative" });
    expect(FILTER_QUERY.toutes).toEqual({});
  });
});

describe("ReviewRow (WT07)", () => {
  it("type, contexte, statut et score du serveur ; « Commenter » vers WT05 ; aucune correction", async () => {
    const { container } = render(<ReviewRow review={review()} showKind />);
    expect(screen.getByText("Formative · Niveau 2 · 4ᵉ B · Robotique")).toBeInTheDocument();
    expect(screen.getByText("Échoué")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Commenter/ })).toHaveAttribute("href", "/enseignant/eleves/21?classe=3&tentative=90");
    expect(screen.queryByRole("button")).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("sommative, sans type affiché sur l'accueil ; tentative commentée : badge, plus de lien", () => {
    const sommative = review({ quiz: { ...review().quiz, kind: "summative" } });
    const { unmount } = render(<ReviewRow review={sommative} showKind />);
    expect(screen.getByText(/^Sommative · /)).toBeInTheDocument();
    unmount();
    render(<ReviewRow review={review({ commented: true })} />);
    expect(screen.queryByText(/Formative/)).toBeNull();
    expect(screen.getByText("Commentée")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });
});

describe("ReviewList", () => {
  const params = { filter: "a-revoir" as const, classroomId: "3", page: 1 };

  it("lignes, sans pagination sur une seule page", async () => {
    const { container } = render(<ReviewList reviews={[review(), review({ id: 91 })]} params={params} hasNext={false} />);
    expect(within(screen.getByRole("list", { name: "Évaluations : À revoir" })).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.queryByRole("navigation", { name: "Pagination des évaluations" })).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("pagination : liens précédent et suivant gardent le filtre et la classe", () => {
    render(<ReviewList reviews={[review()]} params={{ ...params, page: 2 }} hasNext />);
    expect(screen.getByRole("link", { name: "Précédent" })).toHaveAttribute("href", "/enseignant/evaluations?filtre=a-revoir&classe=3");
    expect(screen.getByRole("link", { name: "Suivant" })).toHaveAttribute("href", "/enseignant/evaluations?filtre=a-revoir&classe=3&page=3");
    expect(screen.getByText("Page 2")).toHaveAttribute("aria-current", "page");
  });

  it("première page avec suite : seulement « Suivant »", () => {
    render(<ReviewList reviews={[review()]} params={params} hasNext />);
    expect(screen.queryByRole("link", { name: "Précédent" })).toBeNull();
    expect(screen.getByRole("link", { name: "Suivant" })).toBeInTheDocument();
  });

  it.each(Object.entries(EMPTY_TEXTS))("état vide du filtre %s", (filter, text) => {
    render(<ReviewList reviews={[]} params={{ filter: filter as never, page: 1 }} hasNext={false} />);
    expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("liste vide : le focus passe au message quand le filtre change", () => {
    const { rerender } = render(<ReviewList reviews={[]} params={{ filter: "toutes", page: 1 }} hasNext={false} />);
    rerender(<ReviewList reviews={[]} params={{ filter: "a-revoir", page: 1 }} hasNext={false} />);
    expect(screen.getByText(EMPTY_TEXTS["a-revoir"])).toHaveFocus();
  });

  it("changer de page ou de filtre remet le focus à la liste", () => {
    const { rerender } = render(<ReviewList reviews={[review()]} params={{ filter: "toutes", page: 1 }} hasNext />);
    rerender(<ReviewList reviews={[review()]} params={{ filter: "toutes", page: 2 }} hasNext />);
    expect(screen.getByRole("list", { name: "Évaluations : Toutes" })).toHaveFocus();
  });
});

describe("ClassroomFilter", () => {
  it("choisir une classe met `?classe=` dans l'URL, « Toutes les classes » le retire", async () => {
    const user = userEvent.setup();
    render(<ClassroomFilter classrooms={[classroom()]} params={{ filter: "formatives", page: 3 }} />);
    await user.selectOptions(screen.getByRole("combobox", { name: /Classe/ }), "3");
    expect(router.push).toHaveBeenLastCalledWith("/enseignant/evaluations?filtre=formatives&classe=3");
    await user.selectOptions(screen.getByRole("combobox", { name: /Classe/ }), "");
    expect(router.push).toHaveBeenLastCalledWith("/enseignant/evaluations?filtre=formatives");
  });

  it("classe de l'URL présélectionnée", () => {
    render(<ClassroomFilter classrooms={[classroom()]} params={{ filter: "toutes", classroomId: "3", page: 1 }} />);
    expect(screen.getByRole("combobox", { name: /Classe/ })).toHaveValue("3");
  });
});

describe("WT07 · évaluations", () => {
  function mockApi(reviews: unknown, classrooms: unknown = page([classroom()])) {
    GET.mockImplementation(async (path: string) => (path.includes("reviews") ? reviews : classrooms));
  }

  it("lit les évaluations avec le filtre, la classe et la page de l'URL", async () => {
    mockApi(page([review()], { count: 41, next: "http://api/x?page=2" }));
    const { container } = render(
      await TeacherReviews({ searchParams: Promise.resolve({ filtre: "a-revoir", classe: "3" }) }),
    );
    expect(GET).toHaveBeenCalledWith("/api/classrooms/reviews/", {
      params: { query: { status: "to_review", classroomId: 3, page: 1, pageSize: REVIEWS_PAGE_SIZE } },
    });
    expect(screen.getByRole("link", { name: "À revoir" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Toutes" })).toHaveAttribute("href", "/enseignant/evaluations?classe=3");
    expect(screen.getByRole("status")).toHaveTextContent("41 évaluations");
    expect(screen.getByRole("link", { name: "Suivant" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("une classe qui n'est pas la mienne est ignorée dans l'affichage ; singulier", async () => {
    mockApi(page([review()], { count: 1 }));
    render(await TeacherReviews({ searchParams: Promise.resolve({ classe: "999" }) }));
    expect(screen.getByRole("combobox", { name: /Classe/ })).toHaveValue("");
    expect(screen.getByRole("status")).toHaveTextContent("1 évaluation");
    // La classe étrangère n'est pas transmise à l'API : même liste que « Toutes les classes »
    expect(GET).toHaveBeenCalledWith("/api/classrooms/reviews/", {
      params: { query: { classroomId: undefined, page: 1, pageSize: REVIEWS_PAGE_SIZE } },
    });
    expect(screen.getByRole("link", { name: "Formatives" })).toHaveAttribute("href", "/enseignant/evaluations?filtre=formatives");
  });

  it("sans total renvoyé : aucune évaluation", async () => {
    mockApi(respond(200, {}));
    render(await TeacherReviews({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("status")).toHaveTextContent("0 évaluation");
    expect(screen.getByText(EMPTY_TEXTS.toutes)).toBeInTheDocument();
  });

  it("page au-delà de la dernière : retour à la première, filtre et classe gardés", async () => {
    mockApi(respond(404));
    await expect(
      TeacherReviews({ searchParams: Promise.resolve({ filtre: "sommatives", classe: "3", page: "9" }) }),
    ).rejects.toThrow("REDIRECT /enseignant/evaluations?filtre=sommatives&classe=3");
  });

  it("sans session, ne rend rien ; erreur de l'API levée", async () => {
    mockApi(respond(401));
    expect(await TeacherReviews({ searchParams: Promise.resolve({}) })).toBeNull();
    mockApi(respond(500));
    await expect(TeacherReviews({ searchParams: Promise.resolve({}) })).rejects.toThrow();
  });

  it("sans les classes lues (session perdue), ne rend rien", async () => {
    mockApi(page([review()]), respond(401));
    expect(await TeacherReviews({ searchParams: Promise.resolve({}) })).toBeNull();
  });

  it("squelette accessible", async () => {
    const { container } = render(<TeacherReviewsSkeleton />);
    expect(screen.getByRole("status", { name: "Chargement des évaluations…" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
