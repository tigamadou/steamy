// Objets par défaut surchargés en typé : une fixture ne dit que ce qui la distingue de son défaut (`fabrique`), et
// `fusion` rend un scénario lisible d'un coup d'œil (`scenario({ faults: { outOfStock: true } })`).
// Les défauts sont écrits une fois, typés par le contrat (`Schemas`, `pnpm typecheck`) et validés contre son schéma JSON
// par `contract.test.ts` : un champ requis oublié ne passe ni l'un ni l'autre. Ils ne sont pas échantillonnés du
// contrat : un échantillonneur produirait des valeurs sans sens (« string », 0), alors que chaque écran lit des montants,
// des libellés et des dates qui doivent se tenir ensemble.

/** Surcharge profonde : chaque objet imbriqué peut n'être donné qu'en partie ; tableaux et valeurs sont remplacés. */
export type Partiel<T> = T extends readonly unknown[] ? T : T extends object ? { [K in keyof T]?: Partiel<T[K]> } : T;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Copie profonde de `base` dont les clés de `surcharge` remplacent (ou fusionnent, pour un objet) celles de `base`. */
export function fusion<T>(base: T, surcharge?: Partiel<T>): T {
  if (surcharge === undefined) return structuredClone(base);
  if (!isRecord(base) || !isRecord(surcharge)) return structuredClone(surcharge) as T;
  const result: Record<string, unknown> = structuredClone(base);
  for (const [key, value] of Object.entries(surcharge)) {
    if (value === undefined) continue;
    result[key] = isRecord(value) && isRecord(result[key]) ? fusion(result[key], value) : structuredClone(value);
  }
  return result as T;
}

/** Fabrique d'objets : `const ORDER = fabrique<Schemas["Order"]>({ … })`, puis `ORDER({ status: "paid" })`. */
export function fabrique<T>(base: T): (surcharge?: Partiel<T>) => T {
  return (surcharge) => fusion(base, surcharge);
}
