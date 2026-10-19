import type { Schemas } from "@steamy/api-client";

import { steamyEvent } from "./api-fixtures";

// Candidatures et tickets Steamy Events (API-L3b.6), pour les tests de WD10, WL23 et WD11.

export function application(overrides: Partial<Schemas["Application"]> = {}): Schemas["Application"] {
  const event = steamyEvent();
  return {
    id: 1,
    event: {
      slug: event.slug,
      title: event.title,
      emoji: "⚡",
      color: event.color,
      startsAt: event.startsAt,
      city: "Porto-Novo",
      online: false,
      price: 0,
    },
    learner: { id: 3, firstName: "Léa" },
    status: "pending_parent",
    motivation: "J'adore les robots.",
    selfLevel: "beginner",
    ticketUsed: false,
    parentDecidedAt: null,
    refusalReason: "",
    orderReference: null,
    createdAt: "2026-10-16T10:00:00Z",
    ...overrides,
  };
}

export function ticket(overrides: Partial<Schemas["Ticket"]> = {}): Schemas["Ticket"] {
  return {
    id: 4,
    courseSlug: "robot-bluetooth",
    courseTitle: "Construis ton robot Bluetooth",
    createdAt: "2026-10-01T10:00:00Z",
    used: false,
    usedFor: null,
    ...overrides,
  };
}
