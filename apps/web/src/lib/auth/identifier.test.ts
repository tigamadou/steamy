import { describe, expect, it } from "vitest";

import { identifierKind, isValidUsername, loginIdentifier, looksLikePhone, normalizePhone } from "./identifier";

// Table de cas C7, alignée sur `find_persona` (apps/accounts/backends.py) et `libs/phone.py` de l'API
describe("identifierKind (C7)", () => {
  it.each([
    ["koffi.adekambi@steamy.test", "email"],
    ["  Marie@Exemple.bj ", "email"],
    ["a@b", "email"],
    ["+229 01 90 00 00 01", "phone"],
    ["0190000001", "phone"],
    ["01.90.00.00.01", "phone"],
    ["(01) 90-00-00/01", "phone"],
    ["00229 0190000001", "phone"],
    ["lea.adjovi", "username"],
    ["lea_2012", "username"],
    ["97.00.00a", "username"],
    ["", "username"],
    ["   ", "username"],
  ] as const)("« %s » → %s", (value, kind) => {
    expect(identifierKind(value)).toBe(kind);
  });

  it("ne voit pas de téléphone dans une saisie vide ou faite de séparateurs", () => {
    expect(looksLikePhone(" - . ")).toBe(false);
  });
});

describe("normalizePhone", () => {
  it("met en E.164 avec l'indicatif du Bénin par défaut", () => {
    expect(normalizePhone("01 90 00 00 01")).toBe("+2290190000001");
    expect(normalizePhone("+229 01 90 00 00 01")).toBe("+2290190000001");
    expect(normalizePhone("00229 01 90 00 00 01")).toBe("+2290190000001");
  });

  it("applique l'indicatif du pays choisi", () => {
    expect(normalizePhone("90 12 34 56", "+228")).toBe("+22890123456");
  });

  it("refuse ce qui n'est pas un numéro E.164", () => {
    expect(normalizePhone("123")).toBeNull();
    expect(normalizePhone("+0123456789")).toBeNull();
    expect(normalizePhone("lea.adjovi")).toBeNull();
  });
});

describe("loginIdentifier", () => {
  it("normalise un téléphone et laisse le reste tel quel (rogné)", () => {
    expect(loginIdentifier(" 0190000001 ")).toBe("+2290190000001");
    expect(loginIdentifier("90123456", "228")).toBe("+22890123456");
    expect(loginIdentifier(" lea.adjovi ")).toBe("lea.adjovi");
    expect(loginIdentifier("koffi@steamy.test")).toBe("koffi@steamy.test");
  });

  it("envoie la saisie brute d'un numéro invalide (le serveur répondra)", () => {
    expect(loginIdentifier("12")).toBe("12");
  });
});

describe("isValidUsername (C7)", () => {
  it.each([
    ["lea.adjovi", true],
    ["Lea_2012", true],
    ["abc", true],
    ["ab", false],
    ["a".repeat(31), false],
    ["12345678", false],
    ["97.00.00", false],
    ["lea@adjovi", false],
    ["léa", false],
    ["lea adjovi", false],
  ] as const)("« %s » → %s", (value, valid) => {
    expect(isValidUsername(value)).toBe(valid);
  });
});
