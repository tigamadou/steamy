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

export function quizDetail(overrides: Partial<Schemas["QuizDetail"]> = {}): Schemas["QuizDetail"] {
  return {
    id: 201,
    kind: "formative",
    title: "Quiz servo",
    threshold: 70,
    timeLimitSec: null,
    questionCount: 2,
    state: "available",
    retryInSec: 0,
    course: { slug: "robot-bluetooth", title: "Construis ton robot Bluetooth" },
    project: { id: 2, order: 1, title: "Capteurs & moteurs" },
    level: { id: 21, order: 0, title: "Servo" },
    questions: [
      { id: 1, order: 0, text: "Quel composant fait tourner les roues ?", choices: [{ id: 11, text: "Le moteur" }, { id: 12, text: "Le buzzer" }] },
      { id: 2, order: 1, text: "Que mesure un capteur infrarouge ?", choices: [{ id: 21, text: "La distance" }, { id: 22, text: "Le son" }] },
    ],
    ...overrides,
  };
}

export function attemptDetail(overrides: Partial<Schemas["AttemptDetail"]> = {}): Schemas["AttemptDetail"] {
  return {
    id: 9,
    quiz: { id: 201, kind: "formative", title: "Quiz servo", courseSlug: "robot-bluetooth", projectId: 2, levelId: 21 },
    score: 2,
    total: 2,
    percentage: 100,
    threshold: 70,
    status: "ok",
    passed: true,
    durationSec: 40,
    pointsEarned: 20,
    createdAt: "2026-10-15T10:00:00Z",
    badge: { id: 3, kind: "level", label: "Maître du servo", icon: "⚙️", description: "Niveau Servo validé" },
    failedConcepts: [],
    remediation: [],
    questions: [
      { questionId: 1, text: "Quel composant fait tourner les roues ?", concept: "Moteurs", correct: true, chosenChoiceId: 11, remediationMissionId: null },
      { questionId: 2, text: "Que mesure un capteur infrarouge ?", concept: "Capteurs", correct: true, chosenChoiceId: 21, remediationMissionId: null },
    ],
    retryInSec: 0,
    next: { type: "mission", id: 15, title: "Capteurs avancés", courseSlug: "robot-bluetooth", projectId: 2, levelId: 22, quizKind: null },
    ...overrides,
  };
}

export function learnerBadge(overrides: Partial<Schemas["LearnerBadge"]> = {}): Schemas["LearnerBadge"] {
  return {
    id: 3,
    kind: "level",
    label: "Maître du servo",
    icon: "⚙️",
    description: "Niveau Servo validé",
    awardedAt: "2026-10-15T10:00:00Z",
    course: { slug: "robot-bluetooth", title: "Construis ton robot Bluetooth" },
    projectId: 2,
    levelId: 21,
    ...overrides,
  };
}

export function attemptListItem(overrides: Partial<Schemas["AttemptListItem"]> = {}): Schemas["AttemptListItem"] {
  const { quiz, score, total, percentage, threshold, status, passed, durationSec, pointsEarned, createdAt } = attemptDetail();
  return { id: 9, quiz, score, total, percentage, threshold, status, passed, durationSec, pointsEarned, createdAt, ...overrides };
}

export function progress(overrides: Partial<Schemas["Progress"]> = {}): Schemas["Progress"] {
  return {
    weekSeconds: 4500,
    lastDays: [
      { date: "2026-10-10", seconds: 0 },
      { date: "2026-10-11", seconds: 600 },
      { date: "2026-10-12", seconds: 1200 },
      { date: "2026-10-13", seconds: 900 },
      { date: "2026-10-14", seconds: 300 },
      { date: "2026-10-15", seconds: 1500 },
      { date: "2026-10-16", seconds: 0 },
    ],
    points: 1240,
    rank: { label: "Inventeur", minPoints: 300, nextLabel: "Ingénieur", nextAt: 600 },
    streakDays: 5,
    counters: { activeEnrollments: 2, completedEnrollments: 1, certificates: 1, badges: 4, wishlist: 2 },
    mastery: [
      {
        category: { slug: "robotique", label: "Robotique", color: "#5B3FE0", icon: "🤖" },
        missionsDone: 3,
        missionCount: 10,
        pct: 30,
      },
    ],
    ...overrides,
  };
}
