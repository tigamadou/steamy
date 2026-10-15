import { describe, expect, it } from "vitest";

import { homeForRole, PROFILE_STEP_PATH } from "./home-for-role";

describe("homeForRole", () => {
  it.each([
    ["learner", "/apprenant"],
    ["parent", "/parent"],
    ["teacher", "/enseignant"],
  ] as const)("envoie le rôle %s vers %s", (role, path) => {
    expect(homeForRole({ role, profileStep: null })).toBe(path);
  });

  it("envoie vers l'étape de profil restante avant l'espace", () => {
    expect(homeForRole({ role: "learner", profileStep: "learner-goals" })).toBe(
      "/inscription/apprenant/profil/objectifs",
    );
    expect(homeForRole({ role: "parent", profileStep: "parent-location" })).toBe(
      "/inscription/parent/profil/localisation",
    );
  });

  it("couvre chaque étape de profil d'une route du lot 2", () => {
    for (const path of Object.values(PROFILE_STEP_PATH)) {
      expect(path).toMatch(/^\/inscription\/(apprenant|parent)\/profil\/[a-z-]+$/);
    }
  });

  it("renvoie à l'accueil un compte sans rôle de persona", () => {
    expect(homeForRole({ role: null, profileStep: null })).toBe("/");
  });
});
