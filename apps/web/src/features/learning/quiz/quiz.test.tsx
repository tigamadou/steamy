import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { attemptDetail, failure, learnerBadge, ok, quizDetail } from "@/test/learning-fixtures";

const GET = vi.fn();
const apiCall = vi.fn();
const router = { replace: vi.fn(), push: vi.fn() };
vi.mock("@/lib/api", () => ({ getServerApi: async () => ({ GET }) }));
vi.mock("@/lib/api-call", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api-call")>()),
  apiCall: (request: unknown) => apiCall(request),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  notFound: () => {
    throw new Error("notFound");
  },
}));

const { clearDraft, draftKey, parseDraft, readRawDraft, writeDraft } = await import("./draft");
const { QuizRunner } = await import("./QuizRunner");
const { QuizView } = await import("./QuizView");
const { AttemptSummary, QuizResult, badgeHref } = await import("./QuizResult");
const { BadgeScreen } = await import("./BadgeScreen");

const QUESTIONS = quizDetail().questions;

beforeEach(() => {
  GET.mockReset();
  apiCall.mockReset();
  router.replace.mockReset();
  sessionStorage.clear();
});

describe("brouillon du quiz", () => {
  it("écrit, relit et efface dans l'onglet ; ignore un brouillon illisible ou d'un autre quiz", () => {
    writeDraft(4, { answers: { 1: 11 }, index: 1, startedAt: 1 });
    expect(draftKey(4)).toBe("steamy:quiz:4");
    expect(parseDraft(readRawDraft(4), 2)).toEqual({ answers: { 1: 11 }, index: 1, startedAt: 1 });
    expect(parseDraft(readRawDraft(4), 1)).toBeNull();
    expect(parseDraft("{", 2)).toBeNull();
    expect(parseDraft(null, 2)).toBeNull();
    clearDraft(4);
    expect(readRawDraft(4)).toBeNull();
  });

  it("stockage indisponible : rien ne casse", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqué");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("bloqué");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("bloqué");
    });
    expect(readRawDraft(4)).toBeNull();
    expect(() => writeDraft(4, { answers: {}, index: 0, startedAt: 0 })).not.toThrow();
    expect(() => clearDraft(4)).not.toThrow();
    spy.mockRestore();
    vi.restoreAllMocks();
  });
});

describe("QuizRunner (WJ04 / WJ10)", () => {
  async function answerAll(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole("radio", { name: /Le moteur/ }));
    await user.click(screen.getByRole("button", { name: /Question suivante/ }));
    await user.click(screen.getByRole("radio", { name: /La distance/ }));
  }

  it("envoie toutes les réponses en une fois puis ouvre le résultat ; double envoi bloqué", async () => {
    const user = userEvent.setup();
    let resolve: (value: unknown) => void = () => {};
    apiCall.mockReturnValue(new Promise((r) => (resolve = r)));
    render(<QuizRunner quizId={201} courseSlug="robot-bluetooth" questions={QUESTIONS} />);
    await answerAll(user);
    expect(readRawDraft(201)).toContain('"1":11');
    const send = screen.getByRole("button", { name: /Envoyer mes réponses/ });
    await user.click(send);
    send.click();
    expect(apiCall).toHaveBeenCalledOnce();
    expect(screen.getByText("On corrige tes réponses…")).toBeInTheDocument();
    const POST = vi.fn();
    (apiCall.mock.calls[0][0] as (api: { POST: typeof POST }) => unknown)({ POST });
    expect(POST).toHaveBeenCalledWith("/api/learning/quizzes/{id}/attempts/", {
      params: { path: { id: 201 } },
      body: { answers: [{ questionId: 1, choiceId: 11 }, { questionId: 2, choiceId: 21 }], durationSec: expect.any(Number) },
    });
    await act(async () => resolve({ ok: true, data: attemptDetail() }));
    expect(router.replace).toHaveBeenCalledWith("/apprenant/parcours/robot-bluetooth/quiz/201/resultats/9");
    expect(readRawDraft(201)).toBeNull();
  });

  it("reprend le brouillon de l'onglet après un rechargement", () => {
    writeDraft(201, { answers: { 1: 12 }, index: 1, startedAt: 0 });
    render(<QuizRunner quizId={201} courseSlug="robot-bluetooth" questions={QUESTIONS} />);
    expect(screen.getByText("Question 2 sur 2")).toBeInTheDocument();
  });

  it("QUIZ_COOLDOWN : compte à rebours du délai renvoyé ; sans délai annoncé, lien direct", async () => {
    const user = userEvent.setup();
    apiCall.mockResolvedValue({ ok: false, code: "QUIZ_COOLDOWN", message: "", fields: {}, retryAfter: 300 });
    const { unmount } = render(<QuizRunner quizId={200} courseSlug="robot-bluetooth" questions={QUESTIONS} />);
    await answerAll(user);
    await user.click(screen.getByRole("button", { name: /Envoyer mes réponses/ }));
    expect(screen.getByRole("heading", { name: "Encore un peu de patience" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /dans 5:00/ })).toBeDisabled();
    unmount();
    sessionStorage.clear();
    apiCall.mockResolvedValue({ ok: false, code: "QUIZ_COOLDOWN", message: "", fields: {} });
    render(<QuizRunner quizId={200} courseSlug="robot-bluetooth" questions={QUESTIONS} />);
    await answerAll(user);
    await user.click(screen.getByRole("button", { name: /Envoyer mes réponses/ }));
    expect(screen.getByRole("link", { name: /Réessayer le quiz/ })).toBeInTheDocument();
  });

  it("quiz verrouillé ou réseau coupé : message, nouvel envoi possible", async () => {
    const user = userEvent.setup();
    apiCall.mockResolvedValue({ ok: false, code: "CONTENT_LOCKED", message: "", fields: {} });
    render(<QuizRunner quizId={201} courseSlug="robot-bluetooth" questions={QUESTIONS} />);
    await answerAll(user);
    await user.click(screen.getByRole("button", { name: /Envoyer mes réponses/ }));
    expect(screen.getByRole("alert")).toHaveTextContent("Ce quiz n'est pas encore ouvert");
    apiCall.mockResolvedValue({ ok: false, code: "NETWORK_UNAVAILABLE", message: "", fields: {} });
    await user.click(screen.getByRole("button", { name: /Envoyer mes réponses/ }));
    expect(screen.getByRole("alert")).toHaveTextContent("Le serveur est injoignable");
    expect(apiCall).toHaveBeenCalledTimes(2);
  });
});

describe("QuizView", () => {
  it("formative : seuil de l'API dans l'encart, questions sans corrigé", async () => {
    GET.mockResolvedValue(ok(quizDetail({ threshold: 65 })));
    render((await QuizView({ slug: "robot-bluetooth", quizId: 201 })) as ReactElement);
    expect(screen.getByText(/Obtiens au moins 65 % pour valider le niveau/)).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Fil d'Ariane" })).toHaveTextContent("Niveau 1");
    expect(screen.getByText("Question 1 sur 2")).toBeInTheDocument();
  });

  it("sommative déjà réussie, durée conseillée", async () => {
    GET.mockResolvedValue(ok(quizDetail({ kind: "summative", level: null, state: "done", timeLimitSec: 600 })));
    render((await QuizView({ slug: "robot-bluetooth", quizId: 200 })) as ReactElement);
    expect(screen.getByText(/pour valider le projet/)).toHaveTextContent("Durée conseillée : 10 min.");
    expect(screen.getByText(/Tu as déjà réussi ce quiz/)).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Fil d'Ariane" })).toHaveTextContent("Évaluation du projet");
  });

  it("sommative ratée récemment : délai de l'API, pas de questions", async () => {
    GET.mockResolvedValue(ok(quizDetail({ kind: "summative", level: null, retryInSec: 420 })));
    render((await QuizView({ slug: "robot-bluetooth", quizId: 200 })) as ReactElement);
    expect(screen.getByRole("button", { name: /dans 7:00/ })).toBeDisabled();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  it("verrouillé", async () => {
    GET.mockResolvedValue(failure(403, "CONTENT_LOCKED"));
    render((await QuizView({ slug: "robot-bluetooth", quizId: 200 })) as ReactElement);
    expect(screen.getByRole("heading", { name: "Ce contenu n'est pas encore ouvert" })).toBeInTheDocument();
  });
});

describe("QuizResult (WJ05 / WJ08)", () => {
  it("réussite : score, seuil appliqué, points de l'API, badge", () => {
    render(<AttemptSummary attempt={attemptDetail()} />);
    expect(screen.getByText("2 bonnes réponses sur 2 · seuil 70 %")).toBeInTheDocument();
    expect(screen.getByText("Réussi")).toBeInTheDocument();
    expect(screen.getByText("+20 points")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir mon badge" })).toHaveAttribute(
      "href",
      "/apprenant/parcours/robot-bluetooth/niveaux/21/badge?tentative=9",
    );
    expect(screen.getByRole("link", { name: "Revoir le niveau" })).toBeInTheDocument();
  });

  it("affiche l'API telle quelle, même contraire au bon sens (90 % mais échoué)", () => {
    render(
      <AttemptSummary
        attempt={attemptDetail({ percentage: 90, passed: false, status: "warn", badge: null, pointsEarned: 0, score: 1 })}
      />,
    );
    expect(screen.getByText("90")).toBeInTheDocument();
    expect(screen.getByText("À refaire")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pas encore validé" })).toBeInTheDocument();
    expect(screen.getByText("1 bonne réponse sur 2 · seuil 70 %")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Réessayer le quiz/ })).toHaveAttribute(
      "href",
      "/apprenant/parcours/robot-bluetooth/quiz/201",
    );
  });

  it("sommative ratée : concepts à revoir vers les missions, réessai après le délai", () => {
    const quiz = { ...attemptDetail().quiz, kind: "summative" as const, levelId: null, id: 200 };
    render(
      <AttemptSummary
        attempt={attemptDetail({
          quiz,
          passed: false,
          status: "ko",
          percentage: 0,
          score: 0,
          badge: null,
          retryInSec: 600,
          remediation: [{ missionId: 12, title: "Identifier les moteurs", concept: "Moteurs" }],
        })}
      />,
    );
    expect(screen.getByText("Échoué")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Revoir « Identifier les moteurs »/ })).toHaveAttribute(
      "href",
      "/apprenant/parcours/robot-bluetooth/missions/12",
    );
    expect(screen.getByRole("button", { name: /dans 10:00/ })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Revoir le projet" })).toHaveAttribute(
      "href",
      "/apprenant/parcours/robot-bluetooth/projets/2",
    );
  });

  it("sommative réussie sans badge ni points", () => {
    const quiz = { ...attemptDetail().quiz, kind: "summative" as const, levelId: null };
    render(<AttemptSummary attempt={attemptDetail({ quiz, badge: null, pointsEarned: 0 })} />);
    expect(screen.getByText("Tu as validé le projet.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Voir mon badge" })).not.toBeInTheDocument();
    expect(screen.queryByText(/points/)).not.toBeInTheDocument();
    expect(badgeHref(attemptDetail({ quiz }))).toBe("/apprenant/parcours/robot-bluetooth/projets/2/badge?tentative=9");
  });

  it("lit la tentative dans l'API ; une tentative inconnue est verrouillée", async () => {
    GET.mockResolvedValue(ok(attemptDetail()));
    render((await QuizResult({ slug: "robot-bluetooth", attemptId: 9 })) as ReactElement);
    expect(GET).toHaveBeenCalledWith("/api/learning/attempts/{id}/", { params: { path: { id: 9 } } });
    expect(screen.getByRole("navigation", { name: "Fil d'Ariane" })).toHaveTextContent("Résultats · Quiz servo");
    GET.mockResolvedValue(failure(403, "NOT_ENROLLED"));
    render((await QuizResult({ slug: "robot-bluetooth", attemptId: 9 })) as ReactElement);
    expect(screen.getByRole("heading", { name: "Ce contenu n'est pas encore ouvert" })).toBeInTheDocument();
  });
});

describe("BadgeScreen (WJ06 / WJ11)", () => {
  afterEach(() => GET.mockReset());

  function mockApi(badges: unknown[], attempt?: unknown) {
    GET.mockImplementation(async (path: string) =>
      path === "/api/learning/badges/" ? ok({ count: badges.length, results: badges }) : attempt,
    );
  }

  it("badge de niveau, points et niveau suivant renvoyés par la tentative", async () => {
    mockApi([learnerBadge()], ok(attemptDetail()));
    render((await BadgeScreen({ slug: "robot-bluetooth", kind: "level", id: 21, attemptId: 9 })) as ReactElement);
    expect(screen.getByRole("heading", { level: 1, name: "Niveau terminé !" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Maître du servo" })).toBeInTheDocument();
    expect(screen.getByText("Score : 100 % · +20 points")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Niveau suivant/ })).toHaveAttribute(
      "href",
      "/apprenant/parcours/robot-bluetooth/missions/15",
    );
    expect(screen.queryByText(/Voir mes badges/)).not.toBeInTheDocument();
  });

  it("badge de projet : évaluation, projet suivant ou certification selon l'API", async () => {
    const badge = learnerBadge({ kind: "project", levelId: null });
    const next = attemptDetail().next!;
    for (const [step, label] of [
      [{ ...next, type: "quiz", quizKind: "summative" }, "Passer l'évaluation du projet"],
      [{ ...next, type: "certification", id: null }, "Voir ma certification"],
      [next, "Projet suivant"],
    ] as const) {
      mockApi([badge], ok(attemptDetail({ next: step, pointsEarned: 0 })));
      const { unmount } = render(
        (await BadgeScreen({ slug: "robot-bluetooth", kind: "project", id: 2, attemptId: 9 })) as ReactElement,
      );
      expect(screen.getByRole("heading", { level: 1, name: "Projet validé !" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: new RegExp(label) })).toBeInTheDocument();
      expect(screen.getByText("Score : 100 %")).toBeInTheDocument();
      unmount();
    }
  });

  it("sans tentative réussie : seulement le retour au parcours", async () => {
    mockApi([learnerBadge()], ok(attemptDetail({ passed: false })));
    const { unmount } = render(
      (await BadgeScreen({ slug: "robot-bluetooth", kind: "level", id: 21, attemptId: 9 })) as ReactElement,
    );
    expect(screen.getAllByRole("link")).toHaveLength(1);
    unmount();
    mockApi([learnerBadge()]);
    render((await BadgeScreen({ slug: "robot-bluetooth", kind: "level", id: 21, attemptId: null })) as ReactElement);
    expect(screen.getByRole("link", { name: "Retour à mon parcours" })).toBeInTheDocument();
  });

  it("badge pas encore obtenu → contenu verrouillé", async () => {
    GET.mockImplementation(async () => failure(500));
    render((await BadgeScreen({ slug: "robot-bluetooth", kind: "project", id: 2, attemptId: null })) as ReactElement);
    expect(screen.getByRole("heading", { name: "Ce contenu n'est pas encore ouvert" })).toBeInTheDocument();
  });
});
