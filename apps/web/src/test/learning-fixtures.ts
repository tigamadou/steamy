import type { Schemas } from "@steamy/api-client";

import { COURSE } from "./api-fixtures";

// Réponses factices de la pédagogie (API-L3a), aux formes du client généré.

export const NEXT_MISSION: Schemas["NextStep"] = {
  type: "mission",
  id: 12,
  title: "Servo-moteur",
  courseSlug: "robot-bluetooth",
  projectId: 2,
  levelId: 21,
  quizKind: null,
};

export function enrollment(overrides: Partial<Schemas["Enrollment"]> = {}): Schemas["Enrollment"] {
  return {
    id: 1,
    course: { ...COURSE, slug: "robot-bluetooth", title: "Construis ton robot Bluetooth", difficulty: "intermediate" },
    source: "free",
    status: "active",
    progressPct: 62,
    missionCount: 8,
    missionsDone: 5,
    createdAt: "2026-10-01T08:00:00Z",
    lastActivityAt: "2026-10-15T08:00:00Z",
    completedAt: null,
    currentProject: { id: 2, order: 1, title: "Capteurs & moteurs" },
    currentLevel: { id: 21, order: 0, title: "Servo" },
    next: NEXT_MISSION,
    ...overrides,
  };
}

export const CERTIFICATE: Schemas["Certificate"] = {
  id: 7,
  number: "CERT-2026-000007",
  course: { slug: "robot-bluetooth", title: "Construis ton robot Bluetooth" },
  issuedAt: "2026-09-03T10:00:00Z",
  pdfStatus: "ready",
};

const mission = (id: number, order: number, state: Schemas["StateEnum"]): Schemas["MissionItem"] => ({
  id,
  order: order - 1,
  title: `Mission ${id}`,
  durationMin: 30,
  icon: "⚙️",
  state,
});

export function tree(overrides: Partial<Schemas["Tree"]> = {}): Schemas["Tree"] {
  return {
    ...enrollment(),
    certification: {
      eligible: false,
      missionsDone: 5,
      missionCount: 8,
      summativesPassed: 1,
      summativeCount: 2,
      certificateEnabled: true,
      certificate: null,
      eventTicket: false,
    },
    projects: [
      {
        id: 1,
        order: 0,
        title: "Premiers circuits",
        durationHours: 3,
        state: "done",
        missionCount: 2,
        missionsDone: 2,
        quiz: { id: 100, kind: "summative", title: "Bilan du projet 1", threshold: 80, state: "done" },
        levels: [
          {
            id: 11,
            order: 0,
            title: "Circuit simple",
            durationMin: 60,
            introSummary: "",
            state: "done",
            missionCount: 2,
            missionsDone: 2,
            quiz: { id: 101, kind: "formative", title: "Quiz circuits", threshold: 70, state: "done" },
            missions: [mission(10, 1, "done"), mission(11, 2, "done")],
          },
        ],
      },
      {
        id: 2,
        order: 1,
        title: "Capteurs & moteurs",
        durationHours: 4,
        state: "available",
        missionCount: 3,
        missionsDone: 0,
        quiz: { id: 200, kind: "summative", title: "Bilan du projet 2", threshold: 80, state: "locked" },
        levels: [
          {
            id: 21,
            order: 0,
            title: "Servo",
            durationMin: 90,
            introSummary: "",
            state: "available",
            missionCount: 3,
            missionsDone: 0,
            quiz: { id: 201, kind: "formative", title: "Quiz servo", threshold: 70, state: "locked" },
            missions: [mission(12, 1, "available"), mission(13, 2, "locked"), mission(14, 3, "locked")],
          },
          {
            id: 22,
            order: 1,
            title: "Capteurs avancés",
            durationMin: 45,
            introSummary: "",
            state: "locked",
            missionCount: 1,
            missionsDone: 0,
            quiz: null,
            missions: [mission(15, 1, "locked")],
          },
        ],
      },
      {
        id: 3,
        order: 2,
        title: "Connexion Bluetooth",
        durationHours: 3,
        state: "locked",
        missionCount: 0,
        missionsDone: 0,
        quiz: null,
        levels: [],
      },
    ],
    ...overrides,
  };
}

export function projectDetail(overrides: Partial<Schemas["ProjectDetail"]> = {}): Schemas["ProjectDetail"] {
  return {
    id: 2,
    order: 1,
    title: "Capteurs & moteurs",
    durationHours: 4,
    objectives: ["Calibrer un servo"],
    prerequisites: ["Projet 1"],
    materials: [],
    state: "available",
    missionCount: 4,
    missionsDone: 2,
    course: { slug: "robot-bluetooth", title: "Construis ton robot Bluetooth" },
    quiz: null,
    levels: [
      { id: 21, order: 0, title: "Servo", durationMin: 90, introSummary: "", state: "done", missionCount: 2, missionsDone: 2, quiz: null },
      { id: 22, order: 1, title: "Capteurs", durationMin: 45, introSummary: "", state: "available", missionCount: 2, missionsDone: 0, quiz: null },
      { id: 23, order: 2, title: "Robot", durationMin: 60, introSummary: "", state: "locked", missionCount: 0, missionsDone: 0, quiz: null },
    ],
    ...overrides,
  };
}

export function levelDetail(overrides: Partial<Schemas["LevelDetail"]> = {}): Schemas["LevelDetail"] {
  return {
    id: 21,
    order: 0,
    title: "Brancher les moteurs",
    durationMin: 90,
    introSummary: "Tu vas brancher deux moteurs.",
    introVimeoId: "76979871",
    introVimeoHash: "abc123",
    state: "available",
    course: { slug: "robot-bluetooth", title: "Construis ton robot Bluetooth" },
    project: { id: 2, order: 1, title: "Capteurs & moteurs" },
    missions: [mission(12, 1, "available"), mission(13, 2, "locked")],
    ...overrides,
  };
}

export function missionDetail(overrides: Partial<Schemas["MissionDetail"]> = {}): Schemas["MissionDetail"] {
  return {
    id: 12,
    order: 0,
    title: "Identifier les moteurs",
    durationMin: 45,
    icon: "⚙️",
    vimeoId: "76979871",
    vimeoHash: null,
    blocks: [
      { type: "text", text: "Repère les bornes." },
      { type: "tip", text: "Un petit + est gravé." },
      { type: "media", src: "https://cdn.test/moteur.png", alt: "Un moteur", caption: "Le moteur" },
    ],
    state: "available",
    course: { slug: "robot-bluetooth", title: "Construis ton robot Bluetooth" },
    project: { id: 2, order: 1, title: "Capteurs & moteurs" },
    level: { id: 21, order: 0, title: "Brancher les moteurs" },
    next: { ...NEXT_MISSION, id: 13, title: "Câbler la carte" },
    ...overrides,
  };
}

/** Réponse du client généré : données, ou erreur avec son statut. */
export function ok<T>(data: T) {
  return { data, error: undefined, response: new Response(null, { status: 200 }) };
}

export function failure(status: number, code?: Schemas["ErrorCodeEnum"]) {
  return {
    data: undefined,
    error: code ? ({ code, message: "Refusé", fields: {} } as unknown as Schemas["Error"]) : undefined,
    response: new Response(null, { status }),
  };
}
