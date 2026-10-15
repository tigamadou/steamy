import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { ARTICLES, getArticle } from "./blog";
import { FAQ } from "./faq";
import { GUIDES } from "./guides";
import { getLegalDocument, LEGAL_DOCUMENTS } from "./legal";

const CONTENT_DIR = path.dirname(new URL(import.meta.url).pathname);
const PUBLIC_DIR = path.resolve(CONTENT_DIR, "../../public");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? files(full) : [full];
  });
}

describe("règles du contenu éditorial (S3, D15, D30)", () => {
  const texts = files(CONTENT_DIR)
    .filter((file) => /\.(mdx|ts)$/.test(file) && !file.endsWith(".test.ts"))
    .map((file) => [path.relative(CONTENT_DIR, file), readFileSync(file, "utf8")] as const);

  it("ne mentionne jamais un seuil « moins de 16 ans » : le parent valide à tout âge", () => {
    for (const [file, text] of texts) {
      expect(text, file).not.toMatch(/moins de 16 ans|< ?16 ans|-16 ans/i);
    }
  });

  it("n'attribue jamais de numéro de téléphone à l'apprenant", () => {
    for (const [file, text] of texts) {
      for (const sentence of text.split(/[.\n]/)) {
        if (/apprenant/i.test(sentence) && /num[ée]ro/i.test(sentence)) {
          expect.fail(`${file} : « ${sentence.trim()} »`);
        }
      }
    }
  });
});

describe("blog", () => {
  it("trie les articles du plus récent au plus ancien, avec des métadonnées complètes", () => {
    const dates = ARTICLES.map((a) => a.publishedAt);
    expect(dates).toEqual([...dates].sort().reverse());
    for (const article of ARTICLES) {
      expect(article.title).toBeTruthy();
      expect(article.excerpt).toBeTruthy();
      expect(article.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(article.color).toMatch(/^var\(--/);
      expect(typeof article.Content).toBe("function");
    }
  });

  it("retrouve un article par son slug", () => {
    expect(getArticle("debuter-en-robotique")?.category).toBe("Robotique");
    expect(getArticle("inconnu")).toBeUndefined();
  });
});

describe("documents légaux", () => {
  it("couvre les trois onglets de WL09, avec leur date de mise à jour", () => {
    expect(LEGAL_DOCUMENTS.map((d) => [d.doc, d.tab])).toEqual([
      ["cgu", "CGU"],
      ["mentions-legales", "Mentions légales"],
      ["confidentialite", "Confidentialité"],
    ]);
    for (const document of LEGAL_DOCUMENTS) {
      expect(document.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    expect(getLegalDocument("inconnu")).toBeUndefined();
  });

  it("porte la section « Consentement parental » des CGU (D17, D20-D22)", () => {
    const cgu = readFileSync(path.join(CONTENT_DIR, "legal/cgu.mdx"), "utf8");
    expect(cgu).toContain('id="consentement-parental"');
    expect(cgu).toMatch(/7 jours/);
    expect(cgu).toMatch(/30 jours/);
    expect(cgu).toMatch(/prénom, nom, identifiant de connexion, âge et\s+lien de parenté/);
  });
});

describe("guides", () => {
  it("chaque guide pointe vers un PDF présent, au nombre de pages annoncé", () => {
    for (const guide of GUIDES) {
      const pdf = readFileSync(path.join(PUBLIC_DIR, guide.file)).toString("latin1");
      expect(pdf.startsWith("%PDF-"), guide.file).toBe(true);
      expect(pdf.match(/\/Type \/Page\b/g)?.length, guide.file).toBe(guide.pages);
    }
  });
});

describe("FAQ", () => {
  it("couvre les thèmes de WL24, au vouvoiement", () => {
    expect(FAQ.map((t) => t.title)).toEqual([
      "Compte et consentement",
      "Paiement Mobile Money",
      "Kits et livraison",
      "Événements",
      "Mot de passe oublié",
    ]);
    const answers = FAQ.flatMap((t) => t.items.map((i) => i.answer)).join(" ");
    expect(answers).not.toMatch(/\b(tu|ton|ta|tes)\b/i);
  });
});
