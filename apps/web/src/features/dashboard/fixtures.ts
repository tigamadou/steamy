import type { Schemas } from "@steamy/api-client";

import { course } from "@/test/api-fixtures";

// Réponses factices de `learning/dashboard/` pour les tests du tableau de bord (formes du client généré).

export function enrollment(overrides: Partial<Schemas["Enrollment"]> = {}): Schemas["Enrollment"] {
  return {
    id: 1,
    course: course({ title: "Construis ton robot Bluetooth", slug: "robot-bluetooth" }),
    source: "free",
    status: "active",
    progressPct: 62,
    missionCount: 8,
    missionsDone: 5,
    createdAt: "2026-10-01T10:00:00Z",
    lastActivityAt: "2026-10-15T10:00:00Z",
    completedAt: null,
    currentProject: { id: 4, order: 0, title: "Le châssis" },
    currentLevel: { id: 9, order: 1, title: "Les moteurs" },
    next: {
      type: "mission",
      id: 31,
      title: "Brancher le moteur",
      courseSlug: "robot-bluetooth",
      projectId: 4,
      levelId: 9,
      quizKind: null,
    },
    ...overrides,
  };
}

export function dashboard(overrides: Partial<Schemas["Dashboard"]> = {}): Schemas["Dashboard"] {
  return {
    firstName: "Léa",
    points: 1240,
    rank: { label: "Inventeur", minPoints: 300, nextLabel: "Ingénieur", nextAt: 600 },
    streakDays: 5,
    secondsToday: 600,
    resume: enrollment(),
    counters: { activeEnrollments: 2, completedEnrollments: 1, certificates: 1, badges: 3, wishlist: 2 },
    recommendations: [{ ...course({ slug: "ia", title: "L'IA pour les débutants" }), matchesGoals: true }],
    ...overrides,
  };
}
