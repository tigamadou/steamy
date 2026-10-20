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
