import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { Schemas } from "@steamy/api-client";

// Table `code d'erreur → statut HTTP et message` de la fausse API, LUE dans `apps/api/libs/errors.py` au lieu d'être
// recopiée : un statut qui change côté API change aussi ici, et un code inconnu de l'API fait échouer le démarrage.

const SOURCE = resolve(dirname(fileURLToPath(import.meta.url)), "../../../api/libs/errors.py");
const ENTRY = /"([A-Z][A-Z_]+)":\s*\(\s*S\.HTTP_(\d{3})_[A-Z_]+,\s*"([^"]*)"/g;

const TABLE = new Map<string, { status: number; message: string }>(
  [...readFileSync(SOURCE, "utf8").matchAll(ENTRY)].map(([, code, status, message]) => [code, { status: Number(status), message }]),
);

/** Statut HTTP que l'API donne à ce code d'erreur (`apps/api/libs/errors.py`). */
export function statusOf(code: Schemas["ErrorCodeEnum"]): number {
  const entry = TABLE.get(code);
  if (!entry) throw new Error(`Code d'erreur absent de apps/api/libs/errors.py : ${code}`);
  return entry.status;
}

/** Message par défaut de l'API pour ce code. */
export function messageOf(code: Schemas["ErrorCodeEnum"]): string {
  statusOf(code);
  return TABLE.get(code)!.message;
}
