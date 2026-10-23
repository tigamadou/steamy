import type { Schemas } from "@steamy/api-client";

import type { Register } from "@/lib/api-call";
import { routes, type NotificationTab } from "@/lib/routes";

import { notificationTarget } from "./notification-icon";

type Notification = Pick<Schemas["Notification"], "type" | "url">;

/** Espace qui affiche les notifications : WD04 (apprenant, tutoiement), WPD14 (parent) ou WT12 (enseignant, vouvoiement). */
export type NotificationSpaceId = "learner" | "parent" | "teacher";

export type NotificationSpace = {
  register: Register;
  list: (tab?: NotificationTab, page?: number) => string;
  /** Réglage des notifications (WD06 pour l'apprenant, section de WPD08 pour le parent). */
  preferences: string;
  /** Chemin où mène une notification au clic, `null` s'il n'y en a pas. */
  href: (notification: Notification) => string | null;
  text: {
    loading: string;
    empty: string;
    allRead: string;
    nothingUnread: string;
  };
};

const p = routes.parent;
const t = routes.teacher;

/** Chemin de ce site tiré d'une `url` de l'API, sauf s'il appartient à l'un des `forbidden` espaces ; `null` sinon. */
function targetOutside(url: string, forbidden: string[]): string | null {
  const target = notificationTarget(url);
  return target && !forbidden.some((prefix) => target === prefix || target.startsWith(`${prefix}/`)) ? target : null;
}

/**
 * Cible d'une notification du parent quand l'API n'en donne pas d'utilisable (§5.11, WPD14) : sans identifiant, la
 * liste où retrouver la demande ou l'enfant.
 */
const PARENT_TARGETS: Record<string, string> = {
  consent: p.home,
  consent_request: p.home,
  payment_request: p.home,
  event_application: p.events,
  deletion_request: p.children,
  badge_unlocked: p.children,
  progress: p.children,
  teacher_comment: p.children,
  weekly_report: p.children,
  order: p.orders,
  kit_shipped: p.orders,
  kit_delivered: p.orders,
};

/**
 * Cible d'une notification du parent : l'`url` de l'API quand c'est un chemin de ce site hors des autres espaces
 * (`/parent/demandes/<id>`, `/parent/enfants/<id>/rapport?semaine=…`, une annonce publique…), sinon la cible de son
 * type, sinon aucune.
 */
export function notificationHref({ type, url }: Notification): string | null {
  return parentTarget(url) ?? PARENT_TARGETS[type] ?? null;
}

/** Chemin de ce site tiré d'une `url` de l'API, hors des autres espaces que celui du parent ; `null` sinon. */
export function parentTarget(url: string): string | null {
  return targetOutside(url, ["/apprenant", "/enseignant", "/backoffice"]);
}

/**
 * Cible d'une notification de l'enseignant quand l'API n'en donne pas d'utilisable (§5.12, WT12) : sans identifiant, la
 * liste où retrouver la classe ou l'événement. Les types sont ceux de `classrooms` et `events` (`classroom.joined`…).
 */
const TEACHER_TARGETS: Record<string, string> = {
  "classroom.joined": t.classes,
  "classroom.invitation_refused": t.classes,
  "classroom.invitation_expired": t.classes,
  "classroom.dropout": t.classes,
  "event.proposed": t.events,
};

/**
 * Cible d'une notification de l'enseignant : l'`url` de l'API quand c'est un chemin de ce site hors des autres
 * espaces (`/enseignant/eleves/<id>?classe=<id>` : WT05, `/enseignant/classes/<id>` : WT04, une annonce publique…),
 * sinon la cible de son type, sinon aucune.
 */
export function teacherHref({ type, url }: Notification): string | null {
  return targetOutside(url, ["/apprenant", "/parent", "/backoffice"]) ?? TEACHER_TARGETS[type] ?? null;
}

export const NOTIFICATION_SPACES: Record<NotificationSpaceId, NotificationSpace> = {
  learner: {
    register: "tu",
    list: routes.learner.notificationList,
    preferences: routes.learner.notificationPreferences,
    href: ({ url }) => notificationTarget(url),
    text: {
      loading: "Chargement de tes notifications…",
      empty: "Tu n'as aucune notification. On te prévient dès qu'il se passe quelque chose d'important.",
      allRead: "Toutes tes notifications sont lues.",
      nothingUnread: "Tu as tout lu, rien de neuf.",
    },
  },
  parent: {
    register: "vous",
    list: p.notificationList,
    preferences: `${p.settings}#notifications`,
    href: notificationHref,
    text: {
      loading: "Chargement de vos notifications…",
      empty: "Vous n'avez aucune notification. Nous vous prévenons dès qu'une demande attend votre accord.",
      allRead: "Toutes vos notifications sont lues.",
      nothingUnread: "Vous avez tout lu, rien de neuf.",
    },
  },
  teacher: {
    register: "vous",
    list: t.notificationList,
    preferences: `${t.settings}#notifications`,
    href: teacherHref,
    text: {
      loading: "Chargement de vos notifications…",
      empty: "Vous n'avez aucune notification. Nous vous prévenons dès qu'un élève rejoint une classe ou décroche.",
      allRead: "Toutes vos notifications sont lues.",
      nothingUnread: "Vous avez tout lu, rien de neuf.",
    },
  },
};
