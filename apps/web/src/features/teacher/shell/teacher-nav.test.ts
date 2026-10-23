import { describe, expect, it } from "vitest";

import { TEACHER_PROFILE_HREF, teacherNav, teacherSection } from "./teacher-nav";

describe("teacherNav", () => {
  it("a les 7 entrées de §5.12, seules les entrées livrées sont visibles", () => {
    expect(teacherNav.map((entry) => [entry.id, entry.icon, entry.label])).toEqual([
      ["home", "home", "Accueil"],
      ["courses", "book", "Mes parcours"],
      ["classes", "user", "Mes classes"],
      ["reviews", "star", "Évaluations"],
      ["events", "trophy", "Événements"],
      ["help", "help", "Aide"],
      ["settings", "gear", "Paramètres"],
    ]);
    expect(teacherNav.filter((entry) => !entry.hidden).map((entry) => entry.href)).toEqual([
      "/enseignant",
      "/enseignant/parcours",
      "/enseignant/classes",
      "/enseignant/evaluations",
      "/enseignant/evenements",
    ]);
    expect(teacherNav.map((entry) => entry.href)).toEqual([
      "/enseignant",
      "/enseignant/parcours",
      "/enseignant/classes",
      "/enseignant/evaluations",
      "/enseignant/evenements",
      "/enseignant/aide",
      "/enseignant/parametres",
    ]);
    expect(TEACHER_PROFILE_HREF).toBe("/enseignant/parametres");
  });
});

describe("teacherSection", () => {
  it.each([
    ["/enseignant", "home", "Bonjour Koffi 👋"],
    ["/enseignant/notifications", null, "Notifications"],
    ["/enseignant/parcours", "courses", "Mes parcours encadrés"],
    ["/enseignant/parcours/robot-bluetooth", "courses", "Parcours encadré"],
    ["/enseignant/parcours/robot-bluetooth/missions/4", "courses", "Mission"],
    ["/enseignant/classes", "classes", "Mes classes"],
    ["/enseignant/classes/nouvelle", "classes", "Créer une classe"],
    ["/enseignant/classes/3", "classes", "Élèves de la classe"],
    ["/enseignant/classes/3/modifier", "classes", "Modifier la classe"],
    ["/enseignant/eleves/ajouter", "classes", "Ajouter des élèves"],
    ["/enseignant/eleves/21", "classes", "Profil de l'élève"],
    ["/enseignant/evaluations", "reviews", "Évaluations"],
    ["/enseignant/evenements", "events", "Steamy Events"],
    ["/enseignant/evenements/robot-cup", "events", "Steamy Events"],
    ["/enseignant/aide", "help", "Aide & support"],
    ["/enseignant/parametres", "settings", "Paramètres"],
  ])("%s → %s", (pathname, active, title) => {
    expect(teacherSection(pathname, "Koffi")).toEqual({ active, title });
  });

  it("ne confond pas un préfixe de mot (« /enseignant/classesX ») et retombe sur l'accueil", () => {
    expect(teacherSection("/enseignant/classesX", "Koffi").active).toBe("home");
  });

  it("titre neutre sans prénom", () => {
    expect(teacherSection("/enseignant", "")).toEqual({ active: "home", title: "Accueil" });
  });
});
