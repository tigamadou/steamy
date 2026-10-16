import { describe, expect, it } from "vitest";

import { routes, sectionOf } from "./routes";

describe("routes", () => {
  it("construit les URL paramétrées", () => {
    expect(routes.course("robotique-debutant")).toBe("/parcours/robotique-debutant");
    expect(routes.event("atelier")).toBe("/evenements/atelier");
    expect(routes.article("premier-robot")).toBe("/blog/premier-robot");
    expect(routes.legal("cgu")).toBe("/legal/cgu");
    expect(routes.backoffice.kpi("na_f")).toBe("/backoffice/impact/indicateurs/na_f");
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
