import type { NavEntry } from "@/components/ds/AppShell";
import { routes } from "@/lib/routes";

const t = routes.teacher;

/**
 * Navigation de l'enseignant (SPEC-ECRANS-3 §5.12, « Shell ») : 7 entrées. Une entrée dont les écrans ne sont pas
 * encore livrés est masquée (jamais « Bientôt ») ; chaque étape du lot 5 lève la sienne.
 */
export const teacherNav: NavEntry[] = [
  { id: "home", icon: "home", label: "Accueil", href: t.home },
  { id: "courses", icon: "book", label: "Mes parcours", href: t.courses, hidden: true },
  { id: "classes", icon: "user", label: "Mes classes", href: t.classes, hidden: true },
  { id: "reviews", icon: "star", label: "Évaluations", href: t.reviews(), hidden: true },
  { id: "events", icon: "trophy", label: "Événements", href: t.events, hidden: true },
  { id: "help", icon: "help", label: "Aide", href: t.help, hidden: true },
  { id: "settings", icon: "gear", label: "Paramètres", href: t.settings, hidden: true },
];

/** Lien du profil dans le header : les paramètres (WT08). */
export const TEACHER_PROFILE_HREF: string = t.settings;

export type TeacherSectionId = "home" | "courses" | "classes" | "reviews" | "events" | "help" | "settings";

/** Entrée active (`null` pour WT12, ouvert depuis la cloche) et titre du header (h1 de la page). */
export type TeacherSection = { active: TeacherSectionId | null; title: string };

const ID = "[^/]+";

/**
 * Table unique « chemin → entrée active et titre du header » (§5.12, rattachement des écrans). Du plus précis au plus
 * général : la première expression qui correspond l'emporte.
 */
const SECTIONS: Array<[pattern: RegExp, section: TeacherSection]> = [
  [/^\/enseignant\/notifications$/, { active: null, title: "Notifications" }],
  [/^\/enseignant\/parcours$/, { active: "courses", title: "Mes parcours encadrés" }],
  [new RegExp(`^/enseignant/parcours/${ID}/missions/${ID}$`), { active: "courses", title: "Mission" }],
  [/^\/enseignant\/parcours\/.+$/, { active: "courses", title: "Parcours encadré" }],
  [/^\/enseignant\/classes$/, { active: "classes", title: "Mes classes" }],
  [/^\/enseignant\/classes\/nouvelle$/, { active: "classes", title: "Créer une classe" }],
  [new RegExp(`^/enseignant/classes/${ID}/modifier$`), { active: "classes", title: "Modifier la classe" }],
  [new RegExp(`^/enseignant/classes/${ID}$`), { active: "classes", title: "Élèves de la classe" }],
  [/^\/enseignant\/eleves\/ajouter$/, { active: "classes", title: "Ajouter des élèves" }],
  [new RegExp(`^/enseignant/eleves/${ID}$`), { active: "classes", title: "Profil de l'élève" }],
  [/^\/enseignant\/evaluations$/, { active: "reviews", title: "Évaluations" }],
  [/^\/enseignant\/evenements(\/.*)?$/, { active: "events", title: "Steamy Events" }],
  [/^\/enseignant\/aide$/, { active: "help", title: "Aide & support" }],
  [/^\/enseignant\/parametres$/, { active: "settings", title: "Paramètres" }],
];

/** Entrée active et titre du header pour un chemin de l'espace enseignant ; l'accueil par défaut. */
export function teacherSection(pathname: string, firstName: string): TeacherSection {
  const match = SECTIONS.find(([pattern]) => pattern.test(pathname));
  if (match) return match[1];
  return { active: "home", title: firstName ? `Bonjour ${firstName} 👋` : "Accueil" };
}
