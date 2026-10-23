"use client";

import type { Schemas } from "@steamy/api-client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";

import { Button, ErrorSummary, Field, Textarea } from "@/components/ds";
import { throttledLabel, useThrottle } from "@/components/ds/RetryCountdown";
import { apiCall, errorMessage, type ApiResult } from "@/lib/api-call";
import { routes } from "@/lib/routes";

import { ClassroomField } from "./ClassroomField";
import { ImportReport, correctedLines, reportSummary, type ErrorLine, type SentLine } from "./ImportReport";
import {
  COLUMNS,
  COLUMN_LABELS,
  MAX_FILE_BYTES,
  MAX_IMPORT_ROWS,
  PREVIEW_ROWS,
  TEMPLATE_CSV,
  decodeCsv,
  parseDelimited,
  type ImportRow,
  type RowData,
} from "./parse";

type ImportResult = Schemas["ImportResult"];

type Report = { classroomId: string; sent: SentLine[]; errors: ErrorLine[] };

const TEMPLATE_HREF = `data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE_CSV)}`;
const IDS = { classroom: "lot-classe", file: "lot-fichier", list: "lot-liste" };

function rowData(row: RowData): RowData {
  return { firstName: row.firstName, lastName: row.lastName, parentPhone: row.parentPhone, relationship: row.relationship };
}

/** Lignes d'une réponse du serveur, prêtes pour le rapport : valeurs lues, lues aussi comme point de départ de la correction. */
function toErrorLines(errors: ImportResult["errors"]): ErrorLine[] {
  return errors.map((error) => {
    const data = rowData({
      firstName: error.data.firstName ?? "",
      lastName: error.data.lastName ?? "",
      parentPhone: error.data.parentPhone ?? "",
      relationship: error.data.relationship ?? "",
    });
    return { line: error.line, code: error.code, message: error.message, original: data, data };
  });
}

function toSent(created: ImportResult["created"]): SentLine[] {
  return created.map((member) => ({ id: member.id, name: `${member.firstName} ${member.lastName}`.trim() }));
}

/**
 * WT06 · onglet Import par lot (C19) : fichier CSV ou Excel (200 lignes au plus), ou liste collée (séparateurs `;`,
 * `,` ou tabulation) ; colonnes Prénom, Nom, Téléphone du parent, Lien de parenté ; classe* ; aperçu des 5 premières
 * lignes avant l'envoi. Import partiel : le serveur envoie les lignes valides dans la limite du quota et renvoie les
 * autres, une par une, dans le rapport.
 */
export function BatchImport({
  classrooms,
  defaultClassroom,
  offerExpired = false,
}: {
  classrooms: Pick<Schemas["Classroom"], "id" | "name">[];
  defaultClassroom?: string;
  /** Offre échue : l'ajout d'élèves est bloqué (C21), le serveur répond `SCHOOL_OFFER_EXPIRED`. */
  offerExpired?: boolean;
}) {
  const router = useRouter();
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const [list, setList] = useState("");
  const [file, setFile] = useState<File | null>(null);
  // Texte d'un fichier CSV, lu pour l'aperçu ; un classeur Excel n'a pas d'aperçu
  const [fileText, setFileText] = useState<string | null>(null);
  const [problems, setProblems] = useState<{ field?: string; message: string }[]>([]);
  const [attempt, setAttempt] = useState(0);
  const [report, setReport] = useState<Report | null>(null);
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [failure, setFailure] = useState<string>();
  // Dernière classe choisie : gardée après « Nouvel import »
  const [chosenClassroom, setChosenClassroom] = useState(defaultClassroom ?? "");
  // Annonce du résultat : une région `aria-live` montée avant le résultat, pour qu'il soit lu
  const [announcement, setAnnouncement] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [focusKey, setFocusKey] = useState(0);
  const { wait, track } = useThrottle();

  // Le résultat remplace le formulaire : le focus passe au titre du rapport (après l'envoi comme après un renvoi)
  useEffect(() => {
    if (focusKey > 0) headingRef.current?.focus();
  }, [focusKey]);

  const previewSource = file ? fileText : list;
  // Une seule lecture de la liste, même à chaque frappe ; l'aperçu n'en montre que les premières lignes
  const preview = useMemo(() => (previewSource ? parseDelimited(previewSource) : null), [previewSource]);
  const previewRows: ImportRow[] = preview?.rows.slice(0, PREVIEW_ROWS) ?? [];
  const totalLines = preview ? preview.rows.length + preview.malformed.length : 0;

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0] ?? null;
    // Un fichier trop gros est refusé avant d'être lu : le serveur ne l'accepterait pas non plus
    if (chosen && chosen.size > MAX_FILE_BYTES) {
      event.target.value = "";
      setFile(null);
      setFileText(null);
      setProblems([{ field: IDS.file, message: "Ce fichier dépasse 1 Mo : découpez-le en plusieurs imports." }]);
      setAttempt((n) => n + 1);
      return;
    }
    setProblems([]);
    setFile(chosen);
    setFileText(chosen && /\.csv$/i.test(chosen.name) ? decodeCsv(await chosen.arrayBuffer()) : null);
  }

  /** Un seul envoi à la fois ; le verrou couvre aussi le temps avant le rendu du bouton en chargement. */
  async function send<T>(request: () => Promise<ApiResult<T>>): Promise<ApiResult<T> | null> {
    if (inFlight.current) return null;
    inFlight.current = true;
    setPending(true);
    const result = await request();
    inFlight.current = false;
    setPending(false);
    return result;
  }

  function postRows(classroomId: string, rows: ImportRow[]) {
    return apiCall((api) =>
      api.POST("/api/classrooms/{id}/invitations/import/", { params: { path: { id: classroomId } }, body: { rows } }),
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const classroomId = String(new FormData(event.currentTarget).get("classroomId") ?? "");
    const next: typeof problems = [];
    if (!classroomId) next.push({ field: IDS.classroom, message: "Choisissez une classe." });
    if (!file && !list.trim()) {
      next.push({ field: IDS.list, message: "Choisissez un fichier ou collez une liste d'élèves." });
    }
    setAttempt((n) => n + 1);
    setProblems(next);
    if (next.length > 0) return;

    const parsed = file ? null : parseDelimited(list);
    if (parsed && parsed.rows.length + parsed.malformed.length === 0) {
      setProblems([{ field: IDS.list, message: "La liste ne contient aucune ligne d'élève." }]);
      return;
    }
    const localErrors: ErrorLine[] = (parsed?.malformed ?? []).map(({ line, data }) => ({
      line,
      code: "MALFORMED_ROW",
      message: "Quatre colonnes renseignées sont attendues : prénom, nom, téléphone du parent et lien de parenté.",
      original: data,
      data,
    }));
    // Une liste dont toutes les lignes sont mal formées n'a rien à envoyer : le rapport les montre aussitôt
    const result =
      parsed && parsed.rows.length === 0
        ? ({ ok: true, data: { created: [], errors: [] } } as ApiResult<ImportResult>)
        : await send(() =>
            file
              ? apiCall((api) =>
                  api.POST("/api/classrooms/{id}/invitations/import/", {
                    params: { path: { id: classroomId } },
                    body: { file: file as unknown as string },
                    bodySerializer: () => {
                      const form = new FormData();
                      form.append("file", file);
                      return form;
                    },
                  }),
                )
              : postRows(classroomId, parsed!.rows),
          );
    if (!result) return;
    if (!result.ok) {
      track(result);
      setProblems([{ message: errorMessage(result, "vous") }]);
      setAttempt((n) => n + 1);
      return;
    }
    setProblems([]);
    setChosenClassroom(classroomId);
    setReport({
      classroomId,
      sent: toSent(result.data.created),
      errors: [...localErrors, ...toErrorLines(result.data.errors)].sort((a, b) => a.line - b.line),
    });
    const lines = [...localErrors, ...toErrorLines(result.data.errors)];
    setAnnouncement(reportSummary(result.data.created.length, lines.length));
    setFocusKey((n) => n + 1);
    // Les places utilisées ont changé : le quota affiché est relu
    router.refresh();
  }

  async function resend() {
    if (!report) return;
    const lines = correctedLines(report.errors);
    const result = await send(() =>
      postRows(
        report.classroomId,
        lines.map((line) => ({ line: line.line, ...line.data })),
      ),
    );
    if (!result) return;
    if (!result.ok) {
      track(result);
      setFailure(errorMessage(result, "vous"));
      return;
    }
    setFailure(undefined);
    const resent = new Set(lines.map((line) => line.line));
    const next = {
      classroomId: report.classroomId,
      sent: [...report.sent, ...toSent(result.data.created)],
      errors: [...report.errors.filter((line) => !resent.has(line.line)), ...toErrorLines(result.data.errors)].sort(
        (a, b) => a.line - b.line,
      ),
    };
    setReport(next);
    setAnnouncement(reportSummary(next.sent.length, next.errors.length));
    setFocusKey((n) => n + 1);
    router.refresh();
  }

  function edit(line: number, column: (typeof COLUMNS)[number], value: string) {
    setReport((current) =>
      current && {
        ...current,
        errors: current.errors.map((entry) =>
          entry.line === line ? { ...entry, data: { ...entry.data, [column]: value } } : entry,
        ),
      },
    );
  }

  const live = (
    <p role="status" className="sr-only">
      {announcement}
    </p>
  );

  if (report) {
    return (
      <div className="flex flex-col gap-5">
        {live}
        <ImportReport
          headingRef={headingRef}
          wait={wait}
          sent={report.sent}
          errors={report.errors}
          errorsOnly={errorsOnly}
          onErrorsOnly={setErrorsOnly}
          onEdit={edit}
          onResend={() => void resend()}
          resending={pending}
          failure={failure}
        />
        <div className="flex flex-wrap justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setReport(null);
              setList("");
              setFile(null);
              setFileText(null);
              setFailure(undefined);
            }}
          >
            Nouvel import
          </Button>
          <Button href={routes.teacher.classroom(report.classroomId)}>Voir la classe</Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={(event) => void submit(event)} noValidate aria-label="Importer des élèves" className="flex flex-col gap-4">
      {live}
      {offerExpired && (
        <p className="m-0 rounded-[14px] border-2 border-error-100 bg-error-50 px-3.5 py-3 text-[13px] font-extrabold text-error-700">
          ⛔ L&apos;offre de votre établissement est échue : l&apos;ajout d&apos;élèves est bloqué.
        </p>
      )}
      <ErrorSummary title="Corrigez les erreurs suivantes :" errors={problems} focusKey={attempt} />
      <p className="m-0 text-sm font-semibold text-ink-700">
        Colonnes attendues : {COLUMNS.map((column) => COLUMN_LABELS[column]).join(", ")}. Un fichier CSV ou Excel de 200
        lignes au plus, ou une liste collée.{" "}
        <a
          href={TEMPLATE_HREF}
          download="modele-import-eleves.csv"
          className="font-extrabold text-primary-600 underline"
        >
          Télécharger le modèle CSV
        </a>
      </p>
      <ClassroomField id={IDS.classroom} classrooms={classrooms} defaultValue={chosenClassroom || defaultClassroom} />
      <Field label="Fichier CSV ou Excel" id={IDS.file} hint="Si vous choisissez un fichier, la liste collée est ignorée.">
        <input
          type="file"
          name="file"
          id={IDS.file}
          accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(event) => void onFile(event)}
          className="block w-full text-sm font-bold text-ink-800 file:mr-3 file:cursor-pointer file:rounded-pill file:border-0 file:bg-primary-100 file:px-4 file:py-2 file:font-extrabold file:text-primary-700"
        />
      </Field>
      <Field
        label="Ou collez une liste"
        id={IDS.list}
        hint="Une ligne par élève, colonnes séparées par un point-virgule, une virgule ou une tabulation."
      >
        <Textarea
          name="list"
          rows={6}
          value={list}
          onChange={(event) => setList(event.target.value)}
          disabled={file !== null}
        />
      </Field>
      {file && fileText === null && (
        <p className="m-0 text-[13px] font-bold text-ink-600">
          Aperçu indisponible pour un fichier Excel : le rapport détaille chaque ligne après l&apos;envoi.
        </p>
      )}
      {totalLines > MAX_IMPORT_ROWS && (
        <p className="m-0 text-[13px] font-bold text-amber-700">
          Cette liste compte {totalLines} lignes : un import en accepte {MAX_IMPORT_ROWS} au plus. Le serveur refusera
          l&apos;envoi tel quel : découpez-le en plusieurs imports.
        </p>
      )}
      {preview && (
        <div className="flex flex-col gap-2">
          <p className="m-0 text-sm font-black text-ink-900">
            Aperçu : {Math.min(PREVIEW_ROWS, preview.rows.length)} première
            {Math.min(PREVIEW_ROWS, preview.rows.length) > 1 ? "s" : ""} ligne
            {Math.min(PREVIEW_ROWS, preview.rows.length) > 1 ? "s" : ""} sur {preview.rows.length + preview.malformed.length}
          </p>
          <div className="overflow-x-auto rounded-lg border border-ink-100">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-ink-50 text-xs font-extrabold text-ink-700">
                <tr>
                  <th scope="col" className="px-3 py-2">
                    Ligne
                  </th>
                  {COLUMNS.map((column) => (
                    <th key={column} scope="col" className="px-3 py-2">
                      {COLUMN_LABELS[column]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row) => (
                  <tr key={row.line} className="border-t border-ink-100 font-semibold text-ink-800">
                    <td className="px-3 py-2">{row.line}</td>
                    {COLUMNS.map((column) => (
                      <td key={column} className="px-3 py-2">
                        {row[column]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.malformed.length > 0 && (
            <p className="m-0 text-[13px] font-bold text-amber-700">
              {preview.malformed.length} ligne{preview.malformed.length > 1 ? "s" : ""} mal formée
              {preview.malformed.length > 1 ? "s" : ""} (quatre colonnes renseignées attendues) : elle
              {preview.malformed.length > 1 ? "s seront signalées" : " sera signalée"} dans le rapport.
            </p>
          )}
        </div>
      )}
      <div className="flex justify-end">
        <Button type="submit" loading={pending} disabled={offerExpired || wait > 0} icon="arrow-right">
          {throttledLabel(wait, "Importer et envoyer les demandes")}
        </Button>
      </div>
    </form>
  );
}

