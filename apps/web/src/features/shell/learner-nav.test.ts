import { describe, expect, it } from "vitest";

import { learnerNav, learnerSection } from "./learner-nav";

describe("learnerNav", () => {
  it("a 6 entrées dont 5 visibles, « Badges » masquée (D39)", () => {
    expect(learnerNav.map((entry) => entry.id)).toEqual(["home", "courses", "catalog", "wishlist", "badges", "profile"]);
    expect(learnerNav.filter((entry) => !entry.hidden).map((entry) => entry.label)).toEqual([
      "Accueil",
      "Mes parcours",
      "Catalogue",
      "Mes souhaits",
      "Profil",
    ]);
  });
});

describe("learnerSection", () => {
  it.each([
    ["/apprenant", "home", "Salut Léa 👋"],
    ["/apprenant/notifications", "home", "Notifications"],
    ["/apprenant/notifications/preferences", "home", "Notifications"],
    ["/apprenant/quiz/12", "home", "Mes tentatives de quiz"],
    ["/apprenant/evenements/atelier", "home", "Steamy Events"],
    ["/apprenant/parcours", "courses", "Mes parcours"],
    ["/apprenant/parcours/robot/missions/3", "courses", "Mes parcours"],
    ["/apprenant/catalogue", "catalog", "Catalogue"],
    ["/apprenant/catalogue/robot/kit-code", "catalog", "Débloquer le parcours"],
    ["/apprenant/catalogue/kit-code", "catalog", "Catalogue"],
    ["/apprenant/demandes/4", "catalog", "Demande à ton parent"],
    ["/apprenant/boutique", "catalog", "Boutique de kits"],
    ["/apprenant/boutique/panier", "catalog", "Mon panier"],
    ["/apprenant/souhaits", "wishlist", "Mes souhaits"],
    ["/apprenant/aide", "profile", "Aide & Support"],
    ["/apprenant/profil", "profile", "Profil"],
    ["/apprenant/profil/modifier", "profile", "Modifier mon profil"],
    ["/apprenant/profil/mot-de-passe", "profile", "Mot de passe"],
    ["/apprenant/profil/livraison", "profile", "Adresse de livraison"],
    ["/apprenant/profil/suppression", "profile", "Supprimer mon compte"],
    ["/apprenant/profil/progression", "profile", "Ma progression"],
    ["/apprenant/profil/commandes", "profile", "Mes commandes"],
    ["/apprenant/profil/parent", "profile", "Mon parent"],
  ])("%s → %s", (pathname, active, title) => {
    expect(learnerSection(pathname, "Léa")).toEqual({ active, title });
  });

  it("ne confond pas un préfixe de mot (« /apprenant/parcoursX »)", () => {
    expect(learnerSection("/apprenant/parcoursX", "Léa").active).toBe("home");
  });

  it("titre neutre sans prénom", () => {
    expect(learnerSection("/apprenant", "")).toEqual({ active: "home", title: "Accueil" });
  });
});
