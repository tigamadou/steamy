import { describe, expect, it } from "vitest";

import { fabrique, fusion } from "./defauts.ts";

type Cible = { nom: string; options: { rapide: boolean; taux: number | null }; liste: number[]; lien: { id: number } | null };
const BASE: Cible = { nom: "base", options: { rapide: false, taux: 18 }, liste: [1, 2], lien: { id: 1 } };

describe("fusion", () => {
  it("fusionne les objets imbriqués sans toucher la base", () => {
    const resultat = fusion(BASE, { options: { rapide: true } });
    expect(resultat.options).toEqual({ rapide: true, taux: 18 });
    expect(BASE.options.rapide).toBe(false);
  });

  it("remplace les tableaux et les null, ignore les clés non définies", () => {
    const resultat = fusion(BASE, { liste: [3], lien: null, nom: undefined, options: { taux: null } });
    expect(resultat).toEqual({ nom: "base", options: { rapide: false, taux: null }, liste: [3], lien: null });
  });

  it("remplace un null de la base par l'objet donné, et copie la base sans surcharge", () => {
    expect(fusion({ ...BASE, lien: null }, { lien: { id: 2 } }).lien).toEqual({ id: 2 });
    const copie = fusion(BASE);
    expect(copie).toEqual(BASE);
    expect(copie).not.toBe(BASE);
  });
});

describe("fabrique", () => {
  it("rend un objet neuf à chaque appel", () => {
    const cible = fabrique(BASE);
    expect(cible({ nom: "autre" }).nom).toBe("autre");
    expect(cible().options).not.toBe(cible().options);
  });
});
