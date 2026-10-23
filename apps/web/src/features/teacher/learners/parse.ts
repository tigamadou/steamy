import type { Schemas } from "@steamy/api-client";

/** Ligne d'un import : les quatre colonnes de WT06, et son numéro d'origine (liste collée ou fichier). */
export type ImportRow = { line: number; firstName: string; lastName: string; parentPhone: string; relationship: string };

export type ImportErrorCode = Schemas["ImportErrorCodeEnum"];

/** Valeurs lues d'une ligne en erreur, modifiables en place ; une colonne absente est vide. */
export type RowData = Pick<ImportRow, "firstName" | "lastName" | "parentPhone" | "relationship">;

export const COLUMNS = ["firstName", "lastName", "parentPhone", "relationship"] as const;

/** Libellés des colonnes de WT06, dans l'ordre du modèle CSV. */
export const COLUMN_LABELS: Record<(typeof COLUMNS)[number], string> = {
  firstName: "Prénom",
  lastName: "Nom",
  parentPhone: "Téléphone du parent",
  relationship: "Lien de parenté",
};

/** Modèle CSV téléchargeable : l'en-tête seul, séparé par des points-virgules (tableurs français). */
export const TEMPLATE_CSV = `${COLUMNS.map((column) => COLUMN_LABELS[column]).join(";")}\n`;

/** Nombre de lignes montrées dans l'aperçu avant l'envoi. */
export const PREVIEW_ROWS = 5;

/** Taille maximale d'un fichier d'import, comme le serveur (1 Mo) : refusé avant d'être lu. */
export const MAX_FILE_BYTES = 1024 * 1024;

/** Lignes au plus par import (C19) : au-delà, le serveur refuse (`IMPORT_TOO_LARGE`) ; le front ne fait qu'avertir. */
export const MAX_IMPORT_ROWS = 200;

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Séparateur d'une liste collée : tabulation (tableur), sinon point-virgule, sinon virgule. */
export function detectSeparator(text: string): "\t" | ";" | "," {
  const first = text.split(/\r?\n/).find((line) => line.trim()) ?? "";
  if (first.includes("\t")) return "\t";
  const semicolons = first.split(";").length - 1;
  const commas = first.split(",").length - 1;
  return semicolons > 0 && semicolons >= commas ? ";" : ",";
}

/** Découpe une ligne sur le séparateur, en gardant un séparateur placé entre guillemets (`"Dupont, Jean"`). */
export function splitLine(line: string, separator: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === separator && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

export type ParsedList = {
  /** Lignes de quatre champs renseignés, prêtes pour le serveur. */
  rows: ImportRow[];
  /** Lignes dont la forme est fausse (colonnes en trop ou en moins, champ vide) : signalées sans être envoyées. */
  malformed: { line: number; data: RowData }[];
};

/**
 * Découpe une liste collée ou un CSV en lignes (une ligne non vide = une entrée, numérotée comme dans le texte).
 * L'en-tête (« Prénom… ») est ignoré. Le front ne juge que la forme : colonnes et champs vides ; numéros, doublons,
 * quotas et appartenance à la classe sont décidés par le serveur.
 */
export function parseDelimited(text: string): ParsedList {
  const separator = detectSeparator(text);
  const result: ParsedList = { rows: [], malformed: [] };
  let seenFirst = false;
  text.split(/\r?\n/).forEach((raw, index) => {
    if (!raw.trim()) return;
    const cells = splitLine(raw, separator);
    const first = !seenFirst;
    seenFirst = true;
    if (first && ["prenom", "firstname", "first name"].includes(fold(cells[0] ?? ""))) return;
    const [firstName = "", lastName = "", parentPhone = "", relationship = ""] = cells;
    const row = { line: index + 1, firstName, lastName, parentPhone, relationship };
    if (cells.length !== COLUMNS.length || COLUMNS.some((column) => !row[column])) {
      result.malformed.push({ line: row.line, data: { firstName, lastName, parentPhone, relationship } });
    } else {
      result.rows.push(row);
    }
  });
  return result;
}

/** Texte d'un fichier CSV : UTF-8, sinon Latin-1 (comme le serveur). */
export function decodeCsv(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer).replace(/^﻿/, "");
  } catch {
    return new TextDecoder("latin1").decode(buffer);
  }
}

/** Libellé de chaque code de ligne en erreur du rapport d'import (C19). */
export const ERROR_LABELS: Record<ImportErrorCode, string> = {
  DUPLICATE_ROW: "Doublon dans la liste",
  PHONE_INVALID: "Numéro invalide",
  MALFORMED_ROW: "Ligne mal formée",
  ALREADY_IN_CLASSROOM: "Déjà dans la classe",
  LEARNER_QUOTA_EXCEEDED: "Quota dépassé",
  CONSENT_COOLDOWN: "Demande refusée récemment",
  INVITATION_DAILY_LIMIT: "Limite d'envois atteinte",
};

/** Erreurs qu'une correction de la ligne peut lever ; les autres tiennent à la classe, au quota ou au parent. */
export const EDITABLE_CODES: readonly ImportErrorCode[] = ["MALFORMED_ROW", "PHONE_INVALID", "DUPLICATE_ROW"];
