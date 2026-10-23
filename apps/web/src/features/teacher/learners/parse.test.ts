import { describe, expect, it } from "vitest";

import { TEMPLATE_CSV, decodeCsv, detectSeparator, parseDelimited, splitLine } from "./parse";

describe("detectSeparator", () => {
  it.each([
    ["Yao\tKpadé\t0197000001\tmère", "\t"],
    ["Yao;Kpadé;0197000001;mère", ";"],
    ["Yao,Kpadé,0197000001,mère", ","],
    ["Yao;Kpadé;0197000001;mère, tutrice", ";"],
    ["", ","],
    ["\n\nYao;Kpadé;0197000001;mère", ";"],
  ])("%j → %j", (text, expected) => {
    expect(detectSeparator(text)).toBe(expected);
  });
});

describe("parseDelimited", () => {
  it("découpe une liste, numérote d'après le texte et saute l'en-tête", () => {
    const text = "Prénom;Nom;Téléphone du parent;Lien de parenté\nYao;Kpadé;0197000001;mère\n\n\"Sèna\";\"Kpadé\";0197000002;père";
    const { rows, malformed } = parseDelimited(text);
    expect(malformed).toEqual([]);
    expect(rows).toEqual([
      { line: 2, firstName: "Yao", lastName: "Kpadé", parentPhone: "0197000001", relationship: "mère" },
      { line: 4, firstName: "Sèna", lastName: "Kpadé", parentPhone: "0197000002", relationship: "père" },
    ]);
  });

  it("séparateurs ; , et tabulation, fins de ligne Windows", () => {
    expect(parseDelimited("A,B,0197000001,mère\r\nC,D,0197000002,père").rows).toHaveLength(2);
    expect(parseDelimited("A\tB\t0197000001\tmère").rows).toHaveLength(1);
  });

  it("l'en-tête sans accent ou en anglais est reconnu seulement en première ligne", () => {
    expect(parseDelimited("prenom;nom;tel;lien\nA;B;0197000001;mère").rows).toHaveLength(1);
    expect(parseDelimited("First Name;Last;Tel;Rel\nA;B;0197000001;mère").rows).toHaveLength(1);
    const { rows, malformed } = parseDelimited("A;B;0197000001;mère\nPrénom;B;0197000001;mère");
    expect(rows).toHaveLength(2);
    expect(malformed).toEqual([]);
  });

  it("ne juge que la forme : colonnes en trop ou en moins, champ vide", () => {
    const { rows, malformed } = parseDelimited("A;B;0197000001\nA;B;0197000001;mère;en trop\nA;;0197000001;mère\nA;B;0197000001;mère");
    expect(rows.map((row) => row.line)).toEqual([4]);
    expect(malformed).toEqual([
      { line: 1, data: { firstName: "A", lastName: "B", parentPhone: "0197000001", relationship: "" } },
      { line: 2, data: { firstName: "A", lastName: "B", parentPhone: "0197000001", relationship: "mère" } },
      { line: 3, data: { firstName: "A", lastName: "", parentPhone: "0197000001", relationship: "mère" } },
    ]);
  });

  it("texte vide : rien", () => {
    expect(parseDelimited("  \n ")).toEqual({ rows: [], malformed: [] });
  });
});

describe("splitLine", () => {
  it("garde un séparateur entre guillemets et les guillemets doublés", () => {
    expect(splitLine('"Dupont, Jean",Kpadé,0197000001,mère', ",")).toEqual(["Dupont, Jean", "Kpadé", "0197000001", "mère"]);
    expect(splitLine('"Jean ""JJ"""; Kpadé', ";")).toEqual(['Jean "JJ"', "Kpadé"]);
    expect(splitLine("a;b;", ";")).toEqual(["a", "b", ""]);
  });

  it("une liste dont un nom contient le séparateur reste à quatre colonnes", () => {
    expect(parseDelimited('"Dupont, Jean",Kpadé,0197000001,mère').rows).toHaveLength(1);
  });
});

describe("decodeCsv et modèle", () => {
  it("UTF-8 avec ou sans BOM, sinon Latin-1", () => {
    const utf8 = new TextEncoder().encode("﻿Sèna");
    expect(decodeCsv(utf8.buffer)).toBe("Sèna");
    expect(decodeCsv(new Uint8Array([0x53, 0xe8, 0x6e, 0x61]).buffer)).toBe("Sèna");
  });

  it("le modèle ne contient que l'en-tête des quatre colonnes", () => {
    expect(TEMPLATE_CSV).toBe("Prénom;Nom;Téléphone du parent;Lien de parenté\n");
  });
});
