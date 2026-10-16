import { describe, expect, it } from "vitest";

import { routes, sectionOf } from "./routes";

describe("routes", () => {
  it("construit les URL paramétrées", () => {
    expect(routes.course("robotique-debutant")).toBe("/parcours/robotique-debutant");
    expect(routes.event("atelier")).toBe("/evenements/atelier");
    expect(routes.article("premier-robot")).toBe("/blog/premier-robot");
    expect(routes.legal("cgu")).toBe("/legal/cgu");
    expect(routes.backoffice.kpi("na_f")).toBe("/backoffice/impact/indicateurs/na_f");
    expect(routes.backoffice.report("2026-t4")).toBe("/backoffice/impact/rapports/2026-t4");
    expect(routes.backoffice.reportEntry("2026-t4")).toBe("/backoffice/impact/rapports/2026-t4/saisie");
  });

  it("présélectionne le sujet du formulaire de contact", () => {
    expect(routes.contact()).toBe("/aide#contact");
    expect(routes.contact("candidature")).toBe("/aide?sujet=candidature#contact");
  });

  it("porte le retour après connexion dans un seul paramètre `next`", () => {
    expect(routes.login()).toBe("/connexion");
    expect(routes.login("/parcours/robot")).toBe("/connexion?next=%2Fparcours%2Frobot");
    expect(routes.signup("/evenements/a")).toBe("/inscription?next=%2Fevenements%2Fa");
  });

  it("construit les URL de l'espace apprenant à partir des identifiants de l'API", () => {
    const l = routes.learner;
    expect(l.attempt(7)).toBe("/apprenant/quiz/7");
    expect(l.course("robot")).toBe("/apprenant/parcours/robot");
    expect(l.project("robot", 1)).toBe("/apprenant/parcours/robot/projets/1");
    expect(l.level("robot", 2)).toBe("/apprenant/parcours/robot/niveaux/2");
    expect(l.mission("robot", 3)).toBe("/apprenant/parcours/robot/missions/3");
    expect(l.quiz("robot", 4)).toBe("/apprenant/parcours/robot/quiz/4");
    expect(l.quizResult("robot", 4, 9)).toBe("/apprenant/parcours/robot/quiz/4/resultats/9");
    expect(l.levelBadge("robot", 2)).toBe("/apprenant/parcours/robot/niveaux/2/badge");
    expect(l.projectBadge("robot", 1)).toBe("/apprenant/parcours/robot/projets/1/badge");
    expect(l.certification("robot")).toBe("/apprenant/parcours/robot/certification");
    expect(l.catalogSearch("robot & co")).toBe("/apprenant/catalogue?q=robot%20%26%20co");
    expect(l.catalogCourse("robot")).toBe("/apprenant/catalogue/robot");
  });
});

describe("sectionOf", () => {
  it.each([
    ["/", "home"],
    ["/parcours", "courses"],
    ["/parcours/robotique", "courses"],
    ["/categories", "courses"],
    ["/boutique", "shop"],
    ["/ecoles", "schools"],
    ["/blog/mon-article", "resources"],
    ["/evenements/atelier", "resources"],
    ["/guides", "resources"],
    ["/a-propos", "about"],
  ])("%s → %s", (pathname, section) => {
    expect(sectionOf(pathname)).toBe(section);
  });

  it("n'active aucune rubrique ailleurs, même sur un préfixe trompeur", () => {
    expect(sectionOf("/legal/cgu")).toBeNull();
    expect(sectionOf("/parcoursx")).toBeNull();
  });
});
