import { describe, expect, it, vi } from "vitest";

import { NEXT_MISSION, tree } from "@/test/learning-fixtures";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("notFound");
  },
}));

const { certificateDownloadUrl, readContent } = await import("./content");
const { formatHours, formatLastActivity } = await import("./format");
const { nextStepHref, nextStepLabel } = await import("./next-step");
const { displayState, isNextStep, projectCounts, quizStep, remainingMinutes } = await import("./tree");

const response = (status: number) => new Response(null, { status });

describe("readContent", () => {
  it("rend les données, le refus métier, ou la 404", () => {
    expect(readContent({ data: { a: 1 }, response: response(200) })).toEqual({ ok: true, data: { a: 1 } });
    for (const code of ["CONTENT_LOCKED", "NOT_ENROLLED"] as const) {
      expect(readContent({ error: { code } as never, response: response(403) })).toEqual({ ok: false, code });
    }
    expect(() => readContent({ response: response(404) })).toThrow("notFound");
  });

  it("lève toute autre erreur vers error.tsx", () => {
    expect(() => readContent({ error: { code: "SERVER_ERROR" } as never, response: response(500) })).toThrow(
      "Contenu illisible (500)",
    );
    expect(() => readContent({ response: response(401) })).toThrow("Contenu illisible (401)");
  });

  it("construit l'URL de téléchargement du certificat sur l'API publique", () => {
    vi.stubEnv("PUBLIC_API_URL", "https://api.steamy.test");
    expect(certificateDownloadUrl(7)).toBe("https://api.steamy.test/api/learning/certificates/7/download/");
    vi.stubEnv("PUBLIC_API_URL", "");
    vi.unstubAllEnvs();
    expect(certificateDownloadUrl(7)).toMatch(/\/api\/learning\/certificates\/7\/download\/$/);
  });
});

describe("formats", () => {
  it("durées", () => {
    expect(formatHours(3)).toBe("3 h");
  });

  it("dernière activité au fuseau de la plateforme", () => {
    const now = new Date("2026-10-16T10:00:00Z");
    expect(formatLastActivity("2026-10-16T07:00:00Z", now)).toBe("Aujourd'hui");
    expect(formatLastActivity("2026-10-17T07:00:00Z", now)).toBe("Aujourd'hui");
    expect(formatLastActivity("2026-10-15T20:00:00Z", now)).toBe("Hier");
    expect(formatLastActivity("2026-10-12T08:00:00Z", now)).toBe("Il y a 4 jours");
    expect(formatLastActivity("2026-10-03T08:00:00Z", now)).toBe("3 oct.");
    expect(formatLastActivity(new Date().toISOString())).toBe("Aujourd'hui");
  });
});

describe("étape suivante", () => {
  it("mène à la mission, au quiz ou à la certification renvoyés par l'API", () => {
    expect(nextStepHref(NEXT_MISSION)).toBe("/apprenant/parcours/robot-bluetooth/missions/12");
    expect(nextStepLabel(NEXT_MISSION)).toBe("Continuer la mission");
    const quiz = { ...NEXT_MISSION, type: "quiz" as const, id: 201, quizKind: "formative" as const };
    expect(nextStepHref(quiz)).toBe("/apprenant/parcours/robot-bluetooth/quiz/201");
    expect(nextStepLabel(quiz)).toBe("Passer le quiz du niveau");
    expect(nextStepLabel({ ...quiz, quizKind: "summative" })).toBe("Passer l'évaluation du projet");
    const certification = { ...NEXT_MISSION, type: "certification" as const, id: null };
    expect(nextStepHref(certification)).toBe("/apprenant/parcours/robot-bluetooth/certification");
    expect(nextStepLabel(certification)).toBe("Voir ma certification");
    expect(nextStepHref({ ...NEXT_MISSION, id: null })).toBe("/apprenant/parcours/robot-bluetooth/certification");
  });
});

describe("arbre", () => {
  it("affiche l'état de l'API, la prochaine étape devenant « en cours »", () => {
    expect(displayState("available", true)).toBe("current");
    expect(displayState("available", false)).toBe("available");
    expect(displayState("locked", true)).toBe("locked");
    expect(displayState("done", true)).toBe("done");
    expect(isNextStep(NEXT_MISSION, "mission", 12)).toBe(true);
    expect(isNextStep(NEXT_MISSION, "quiz", 12)).toBe(false);
    expect(isNextStep(NEXT_MISSION, "mission", 13)).toBe(false);
  });

  it("compte les projets par état et le temps restant des missions non faites", () => {
    const { projects } = tree();
    expect(projectCounts(projects)).toEqual({ done: 1, available: 1, locked: 1 });
    expect(remainingMinutes(projects)).toBe(120);
    expect(quizStep("formative")).toBe("Quiz du niveau");
    expect(quizStep("summative")).toBe("Évaluation du projet");
  });
});
