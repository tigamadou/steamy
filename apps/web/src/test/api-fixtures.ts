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

export const COURSE_DETAIL: Schemas["CourseDetail"] = {
  ...COURSE,
  slug: "initiation-scratch",
  title: "Initiation à Scratch",
  description: "Programme tes premières animations.",
  outcomes: ["Premiers blocs", "Mini-jeu", 42],
  audience: "Apprenants de 10 à 17 ans",
  prerequisites: ["Savoir lire"],
  certificateEnabled: true,
  missionCount: 3,
  projects: [
    {
      order: 0,
      title: "Premiers blocs",
      levels: [
        {
          order: 0,
          title: "L'interface",
          missions: [
            { order: 0, title: "Découvrir l'interface" },
            { order: 1, title: "Mes personnages" },
          ],
        },
      ],
    },
    {
      order: 1,
      title: "Mon mini-jeu",
      levels: [{ order: 0, title: "Le jeu", missions: [{ order: 0, title: "Écran de fin" }] }],
    },
  ],
};

export function courseDetail(overrides: Partial<Schemas["CourseDetail"]> = {}): Schemas["CourseDetail"] {
  return { ...COURSE_DETAIL, ...overrides };
}

export const EVENT: Schemas["SteamyEventDetail"] = {
  slug: "atelier-electronique",
  title: "Atelier Électronique débutant",
  emoji: "⚡",
  color: "#0EA5E9",
  startsAt: "2026-11-05T13:00:00Z",
  endsAt: "2026-11-05T15:30:00Z",
  online: false,
  place: "Maison des jeunes",
  city: "Porto-Novo",
  audience: "12 – 15 ans",
  price: 0,
  isFree: true,
  capacity: 20,
  seatsLeft: 8,
  applicationDeadline: "2026-11-02T13:00:00Z",
  applicationsOpen: true,
  isPast: false,
  description: "Monte tes premiers circuits.",
};

export function steamyEvent(overrides: Partial<Schemas["SteamyEventDetail"]> = {}): Schemas["SteamyEventDetail"] {
  return { ...EVENT, ...overrides };
}

export const KIT: Schemas["Kit"] = {
  slug: "steamy-bot-v1",
  name: "Steamy Bot v1",
  category: { slug: "robotique", label: "Robotique", color: "#5B3FE0", icon: "🤖" },
  price: 35000,
  difficulty: "beginner",
  emoji: "🤖",
  available: true,
};
