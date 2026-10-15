import type { Schemas } from "@steamy/api-client";

type Notification = Pick<Schemas["Notification"], "type" | "category" | "icon">;

// Pictogrammes des notifications (D7) : l'icône fournie par l'API si c'est déjà un emoji, sinon celle de son nom,
// de son `type` (identifiant stable de l'événement), puis de sa catégorie.

const BY_NAME: Record<string, string> = {
  megaphone: "📣",
  trophy: "🏆",
  bell: "🔔",
  book: "📘",
  gift: "🎁",
};

const BY_TYPE: Record<string, string> = {
  welcome: "👋",
  announcement: "📣",
  course_recommended: "🎁",
  badge_unlocked: "🏆",
  mission_completed: "🎯",
  level_completed: "🎯",
  project_completed: "🎯",
  certificate_issued: "🎓",
  kit_shipped: "📦",
  payment_request_paid: "✅",
  payment_request_failed: "⚠️",
  payment_request_refused: "⚠️",
  event_application_accepted: "🎟️",
  event_application_refused: "📭",
  teacher_comment: "💬",
};

const BY_CATEGORY: Partial<Record<Schemas["CategoryEnum"], string>> = {
  learning: "📘",
  rewards: "🏆",
  coaching: "💬",
  events: "🎟️",
  payments: "💳",
  account: "👤",
};

const DEFAULT_ICON = "🔔";

/** Vrai si la chaîne contient un pictogramme (et non un nom d'icône en ASCII). */
function isEmoji(value: string): boolean {
  return /\p{Extended_Pictographic}/u.test(value);
}

export function notificationIcon({ icon, type, category }: Notification): string {
  if (icon && isEmoji(icon)) return icon;
  return BY_NAME[icon] ?? BY_TYPE[type] ?? BY_CATEGORY[category] ?? DEFAULT_ICON;
}

/** Chemin interne vers lequel naviguer au clic, `null` si l'API n'en donne pas (ou pas un chemin de ce site). */
export function notificationTarget(url: string): string | null {
  return url.startsWith("/") && !url.startsWith("//") && !/[\\\s]/.test(url) ? url : null;
}
