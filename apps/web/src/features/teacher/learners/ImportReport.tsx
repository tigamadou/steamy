"use client";

import { useId } from "react";

import { Badge, Button, Checkbox, Input } from "@/components/ds";

import { COLUMN_LABELS, COLUMNS, EDITABLE_CODES, ERROR_LABELS, type ImportErrorCode, type RowData } from "./parse";

/** Ligne en erreur du rapport : ce que le serveur a lu (`original`) et ce que l'enseignant a corrigé (`data`). */
export type ErrorLine = { line: number; code: ImportErrorCode; message: string; original: RowData; data: RowData };

/** Invitation envoyée par l'import : prénom et nom saisis. */
export type SentLine = { id: number; name: string };

/** Ligne dont une valeur a été corrigée depuis la dernière lecture du serveur. */
export function isEdited(line: ErrorLine): boolean {
  return COLUMNS.some((column) => line.data[column] !== line.original[column]);
}

/** Lignes à renvoyer : celles dont la valeur a été corrigée et que le serveur peut accepter après correction. */
export function correctedLines(lines: readonly ErrorLine[]): ErrorLine[] {
  return lines.filter((line) => EDITABLE_CODES.includes(line.code) && isEdited(line));
}

type Props = {
  sent: readonly SentLine[];
  errors: readonly ErrorLine[];
  errorsOnly: boolean;
  onErrorsOnly: (value: boolean) => void;
  onEdit: (line: number, column: (typeof COLUMNS)[number], value: string) => void;
  onResend: () => void;
  resending: boolean;
  /** Message d'échec du dernier renvoi (réseau, plafond, fichier trop long…), conservé pour un nouvel essai. */
  failure?: string;
};

/**
 * « Résultat d'import » (WT06, C19) : une ligne par entrée avec son statut, filtre « Erreurs seulement », correction
 * en place des lignes dont l'erreur se corrige, puis « Renvoyer les lignes corrigées ». Les statuts sont ceux du
 * serveur ; le front ne les recalcule pas.
 */
export function ImportReport({ sent, errors, errorsOnly, onErrorsOnly, onEdit, onResend, resending, failure }: Props) {
  const baseId = useId();
  const corrected = correctedLines(errors);
  return (
    <section aria-labelledby="resultat-import" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="resultat-import" className="m-0 text-lg font-black tracking-[-0.01em] text-ink-900">
          Résultat d&apos;import
        </h2>
        <p role="status" className="m-0 text-sm font-extrabold text-ink-700">
          {sent.length} demande{sent.length > 1 ? "s" : ""} envoyée{sent.length > 1 ? "s" : ""} · {errors.length} ligne
          {errors.length > 1 ? "s" : ""} à vérifier
        </p>
      </div>
      <Checkbox
        label="Erreurs seulement"
        checked={errorsOnly}
        onChange={(event) => onErrorsOnly(event.target.checked)}
      />
      {failure && (
        <p role="alert" className="m-0 text-sm font-bold text-error-700">
          {failure}
        </p>
      )}
      <ul aria-label="Lignes de l'import" className="m-0 flex list-none flex-col gap-2 p-0">
        {errors.map((line) => {
          const editable = EDITABLE_CODES.includes(line.code);
          return (
            <li
              key={line.line}
              aria-label={`Ligne ${line.line}`}
              className="flex flex-col gap-3 rounded-[14px] border border-error-100 bg-surface px-4.5 py-3.5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-extrabold text-ink-900">Ligne {line.line}</span>
                <Badge tone="error">{ERROR_LABELS[line.code]}</Badge>
                <span className="text-xs font-semibold text-ink-600">{line.message}</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {COLUMNS.map((column) => {
                  const id = `${baseId}-${line.line}-${column}`;
                  return (
                    <div key={column} className="flex flex-col gap-1">
                      <label htmlFor={id} className="text-xs font-bold text-ink-700">
                        {COLUMN_LABELS[column]}
                        <span className="sr-only"> de la ligne {line.line}</span>
                      </label>
                      <Input
                        id={id}
                        value={line.data[column]}
                        readOnly={!editable}
                        onChange={(event) => onEdit(line.line, column, event.target.value)}
                        className="h-11"
                      />
                    </div>
                  );
                })}
              </div>
            </li>
          );
        })}
        {!errorsOnly &&
          sent.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-wrap items-center gap-2 rounded-[14px] border border-ink-100 bg-surface px-4.5 py-3"
            >
              <span className="text-sm font-extrabold text-ink-900">{entry.name}</span>
              <Badge tone="success">Envoyée</Badge>
            </li>
          ))}
      </ul>
      {errors.length === 0 && (
        <p className="m-0 text-sm font-bold text-success-700">Toutes les demandes sont parties : aucune ligne à corriger.</p>
      )}
      {errors.some((line) => EDITABLE_CODES.includes(line.code)) && (
        <div className="flex flex-wrap items-center justify-end gap-3">
          <p className="m-0 text-xs font-semibold text-ink-600">
            Corrigez les valeurs des lignes en erreur, puis renvoyez-les : seules les lignes corrigées repartent.
          </p>
          <Button onClick={onResend} loading={resending} disabled={corrected.length === 0}>
            Renvoyer les lignes corrigées
          </Button>
        </div>
      )}
    </section>
  );
}
