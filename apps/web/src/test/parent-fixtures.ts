import type { Schemas } from "@steamy/api-client";

// Données factices de l'espace parent (formes du client généré), d'après le jeu D2 : Marie, Léa et Noé Adjovi.

export function child(overrides: Partial<Schemas["Child"]> = {}): Schemas["Child"] {
  return {
    id: 7,
    firstName: "Léa",
    lastName: "Adjovi",
    username: "lea.adjovi",
    status: "active",
    age: 13,
    relationship: { id: 1, code: "mere", label: "Mère", parentLabel: "Fille" },
    avatar: { id: 1, code: "renard", label: "Renard", emoji: "🦊", color: "primary-500" },
    schoolGrade: { id: 4, code: "4e", label: "4ᵉ" },
    points: 120,
    streakDays: 3,
    rank: "Exploratrice",
    profileStep: null,
    createdAt: "2026-09-01T09:00:00Z",
    deletion: null,
    activeCourses: 2,
    ...overrides,
  };
}

export function enrollment(overrides: Partial<Schemas["Enrollment"]> = {}): Schemas["Enrollment"] {
  return {
    id: 31,
    course: {
      slug: "robot-bluetooth",
      title: "Construis ton robot Bluetooth",
      category: { slug: "robotique", label: "Robotique", color: "#7c3aed", icon: "🤖" },
      difficulty: "beginner",
      emoji: "🤖",
      requiredKit: null,
      coverImage: null,
    },
    source: "free",
    status: "active",
    progressPct: 62,
    missionCount: 8,
    missionsDone: 5,
    createdAt: "2026-09-02T09:00:00Z",
    lastActivityAt: "2026-10-14T16:00:00Z",
    completedAt: null,
    currentProject: null,
    currentLevel: null,
    next: { type: "mission", id: 1, title: "Allumer une LED", courseSlug: "robot-bluetooth", projectId: 1, levelId: 1, quizKind: null },
    ...overrides,
  };
}

export function attempt(overrides: Partial<Schemas["AttemptListItem"]> = {}): Schemas["AttemptListItem"] {
  return {
    id: 51,
    quiz: { id: 4, kind: "formative", title: "Quiz · Premiers capteurs", courseSlug: "robot-bluetooth", projectId: 1, levelId: 1 },
    score: 9,
    total: 10,
    percentage: 90,
    threshold: 70,
    status: "ok",
    passed: true,
    durationSec: 300,
    pointsEarned: 20,
    createdAt: "2026-10-14T15:00:00Z",
    ...overrides,
  };
}

export function childDetail(overrides: Partial<Schemas["ChildDetail"]> = {}): Schemas["ChildDetail"] {
  return {
    ...child(),
    relationship: { id: 1, code: "mere", label: "Mère", parentLabel: "Vous êtes sa mère" },
    courses: [enrollment()],
    recentAttempts: [attempt()],
    badges: 5,
    birthDate: "2013-03-14",
    gender: "female",
    disability: null,
    locality: { id: 12, country: "BJ", city: "Cotonou", district: "Cocotomey", areaType: "urban" },
    goals: [],
    publicDisplayAllowed: false,
    ...overrides,
  };
}

export function pendingAction(overrides: Partial<Schemas["PendingAction"]> = {}): Schemas["PendingAction"] {
  return {
    type: "payment_request",
    id: "12",
    childId: 7,
    childFirstName: "Léa",
    childLastName: "Adjovi",
    createdAt: "2026-10-15T08:00:00Z",
    url: "/parent/demandes/12",
    ...overrides,
  };
}
