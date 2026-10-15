import { describe, expect, it } from "vitest";

import { loginUrl, safeNext } from "./safe-next";

describe("safeNext", () => {
  it.each([
    ["/apprenant", "/apprenant"],
    ["/parent/enfants/12?onglet=progres#haut", "/parent/enfants/12?onglet=progres#haut"],
    ["/enseignant/classes/3", "/enseignant/classes/3"],
    ["/parcours/robotique-debutant", "/parcours/robotique-debutant"],
    ["/consentement/abc123", "/consentement/abc123"],
    ["/inscription/parent/demande/7", "/inscription/parent/demande/7"],
    ["/apprenant/./catalogue", "/apprenant/catalogue"],
  ])("accepte le chemin interne %s", (next, expected) => {
    expect(safeNext(next)).toBe(expected);
  });

  it.each([
    [null],
    [undefined],
    [""],
    ["apprenant"],
    ["https://evil.example/apprenant"],
    ["//evil.example/apprenant"],
    ["/\\evil.example"],
    ["\\\\evil.example"],
    ["javascript:alert(1)"],
    ["/ apprenant"],
    ["/apprenant\n/x"],
    ["/"],
    ["/connexion?next=/apprenant"],
    ["/inscription"],
    ["/parentx"],
    ["/apprenant/../connexion"],
    ["/%2e%2e/connexion"],
    ["/backoffice@evil"],
    ["/.//evil.example"],
    ["/apprenant/..//evil.example"],
    ["/\t/evil.example"],
  ])("refuse %s", (next) => {
    expect(safeNext(next)).toBeNull();
  });
});

describe("loginUrl", () => {
  it("ajoute le retour quand il est sûr", () => {
    expect(loginUrl("/parent/demandes/3")).toBe("/connexion?next=%2Fparent%2Fdemandes%2F3");
  });

  it("l'omet sinon", () => {
    expect(loginUrl("https://evil.example")).toBe("/connexion");
    expect(loginUrl(null)).toBe("/connexion");
    expect(loginUrl()).toBe("/connexion");
  });
});
