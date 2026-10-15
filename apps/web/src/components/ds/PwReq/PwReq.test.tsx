import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { PASSWORD_RULES, PwReq, checkPassword, isPasswordValid } from "./PwReq";

describe("règles du mot de passe", () => {
  it("reprend mot pour mot les libellés de l'API", () => {
    // Copie volontaire de `RULES` dans apps/api/apps/accounts/password_validation.py : à garder synchrone
    expect(PASSWORD_RULES.map((rule) => rule.label)).toEqual([
      "Au moins 8 caractères",
      "Au moins une lettre et un chiffre",
    ]);
  });

  it("évalue chaque règle", () => {
    expect(checkPassword("abc")).toEqual([
      { id: "length", label: "Au moins 8 caractères", ok: false },
      { id: "letter-digit", label: "Au moins une lettre et un chiffre", ok: false },
    ]);
    expect(checkPassword("12345678").map((r) => r.ok)).toEqual([true, false]);
    expect(checkPassword("abcdefgh").map((r) => r.ok)).toEqual([true, false]);
    expect(checkPassword("a1").map((r) => r.ok)).toEqual([false, true]);
  });

  it("accepte les lettres accentuées comme lettres", () => {
    expect(isPasswordValid("éééééé12")).toBe(true);
    expect(isPasswordValid("________1")).toBe(false);
    expect(isPasswordValid("motdepasse1")).toBe(true);
  });

  it("compte comme l'API : chiffres Unicode et longueur en caractères", () => {
    expect(isPasswordValid("motdepasse٣")).toBe(true);
    // 4 emoji = 8 unités UTF-16 mais 4 caractères pour Python
    expect(checkPassword("a1🤖🤖🤖")[0].ok).toBe(false);
  });
});

describe("PwReq", () => {
  it("annonce l'état de chaque règle", () => {
    render(<PwReq password="abcdefgh" />);
    const list = screen.getByRole("list");
    expect(list).toHaveAttribute("aria-live", "polite");
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Au moins 8 caractères (respectée)");
    expect(items[1]).toHaveTextContent("Au moins une lettre et un chiffre (non respectée)");
    expect(items[1]).toHaveClass("text-ink-600");
  });

  it("passe les règles non respectées en rouge en cas d'erreur", () => {
    render(<PwReq password="abcdefgh" error />);
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveClass("text-success-700");
    expect(items[1]).toHaveClass("text-error-600");
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(<PwReq password="abc1" error />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
