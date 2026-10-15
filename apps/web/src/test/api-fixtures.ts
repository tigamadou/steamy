import type { Schemas } from "@steamy/api-client";

// Données d'API factices pour les tests de composants (formes du client généré).

export const CATEGORY: Schemas["Category"] = {
  slug: "robotique",
  label: "Robotique",
  color: "#5B3FE0",
  icon: "🤖",
  courseCount: 2,
};

export const COURSE: Schemas["CourseList"] = {
  slug: "decouverte-robotique",
  title: "Découverte de la robotique",
  category: { slug: "robotique", label: "Robotique", color: "#5B3FE0", icon: "🤖" },
  difficulty: "beginner",
  isFree: true,
  price: 0,
  emoji: "🤖",
  requiredKit: null,
  coverImage: null,
  durationHours: 4,
  featured: true,
};

export function course(overrides: Partial<Schemas["CourseList"]> = {}): Schemas["CourseList"] {
  return { ...COURSE, ...overrides };
}

/** Réponse JSON, comme le fetch de l'API. */
export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
