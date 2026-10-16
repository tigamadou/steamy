import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

// Back-office monochrome (SPEC-TECHNIQUE §2.4, SPEC-ECRANS-3 §5.14) : aucune couleur de la famille primaire, ni
// directement (`--primary-*`, `primary-500`), ni par les ombres « candy » qui la contiennent (`shadow-card`).
const SRC = join(process.cwd(), "src");
const DIRS = ["components/backoffice", "app/(backoffice)"];
const FORBIDDEN = /--primary-|\bprimary-\d|shadow-card|variant="primary"/;

function files(dir: string): string[] {
  return readdirSync(join(SRC, dir), { recursive: true, encoding: "utf8" })
    .filter((file) => /\.tsx?$/.test(file) && !file.endsWith(".test.ts") && !file.endsWith(".test.tsx"))
    .map((file) => join(dir, file));
}

describe("garde-fou monochrome du back-office", () => {
  const sources = DIRS.flatMap(files);

  it("examine les fichiers du back-office", () => {
    expect(sources).toContain(join("components/backoffice", "AdminShell.tsx"));
    expect(sources).toContain(join("app/(backoffice)", "layout.tsx"));
  });

  it.each(sources)("%s n'emploie aucune couleur primaire", (file) => {
    expect(readFileSync(join(SRC, file), "utf8")).not.toMatch(FORBIDDEN);
  });

  it("détecte bien les couleurs interdites", () => {
    for (const sample of ["var(--primary-500)", "bg-primary-100", "shadow-card-hover", 'variant="primary"']) {
      expect(sample).toMatch(FORBIDDEN);
    }
  });
});
