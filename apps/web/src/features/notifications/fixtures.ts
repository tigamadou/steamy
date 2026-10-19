import type { Schemas } from "@steamy/api-client";

// Notifications factices pour les tests de WD04 à WD06 (formes du client généré).

export function notification(overrides: Partial<Schemas["Notification"]> = {}): Schemas["Notification"] {
  return {
    id: 1,
    type: "course_recommended",
    category: "learning",
    tone: "info",
    icon: "",
    title: "Un parcours pour toi",
    message: "Découvre les bases de la robotique avec Zeti.",
    url: "/apprenant/catalogue",
    readAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export const PREFERENCES: Schemas["Preferences"] = {
  emailAddress: "lea@exemple.bj",
  categories: [
    { category: "learning", label: "Apprentissage", inApp: true, email: true },
    { category: "rewards", label: "Récompenses", inApp: true, email: false },
  ],
};
