"use client";

import type { Schemas } from "@steamy/api-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Breadcrumb } from "@/components/ds/Breadcrumb";
import { Button } from "@/components/ds/Button";
import { getBrowserApi } from "@/lib/api-browser";
import { apiErrorBody, errorMessage } from "@/lib/api-call";
import { cx } from "@/lib/cx";
import { routes } from "@/lib/routes";

import { CARD, FOCUS } from "./styles";

type Row = Schemas["ReportRow"];
type Unit = Row["unit"];

/** Cartes de WAD05 : groupes de l'API regroupés comme dans la maquette ; un groupe inconnu va dans « Autres ». */
export const ENTRY_CARDS: Array<{ title: string; groups: string[] }> = [
  { title: "Financement", groups: ["sales"] },
  { title: "Produit & innovation", groups: ["product"] },
  { title: "Satisfaction & emploi", groups: ["satisfaction", "employment"] },
];

const UNIT_HINT: Partial<Record<Unit, string>> = { fcfa: " (FCFA)" };

const REQUIRED = "À renseigner avant la soumission.";

/** Valeur serveur → texte du champ (`oui` / `non` pour les booléens, vide si absente). */
export function toField(value: Row["value"]): string {
  if (value === null) return "";
  if (typeof value === "boolean") return value ? "oui" : "non";
  return String(value);
}

/**
 * Texte du champ → valeur envoyée : vide → `null` (efface la saisie), oui / non → booléen, nombre si l'unité est
 * numérique et le texte lisible ; sinon le texte tel quel, que le serveur refuse avec un message par champ.
 */
export function toValue(text: string, unit: Unit): Row["value"] {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  if (unit === "yes_no") return trimmed === "oui";
  if (unit === "text") return trimmed;
  const number = Number(trimmed.replace(/\s/g, "").replace(",", "."));
  return Number.isNaN(number) ? trimmed : number;
}

type Feedback = { tone: "info" | "error"; text: string; complete?: boolean };

export type ManualEntryFormProps = {
  period: string;
  label: string;
  /** Rapport soumis : saisie en lecture seule (D74). */
  locked: boolean;
  /** Lignes manuelles du rapport (`source: "manual"`). */
  rows: Row[];
};

/**
 * WAD05 · Saisie des indicateurs manuels : champs typés selon l'unité, « Enregistrer le brouillon » (`PATCH
 * …/values/`), « Valider la saisie » (enregistre puis vérifie que chaque indicateur est renseigné). Le serveur
 * contrôle chaque valeur (`VALIDATION_ERROR` par champ) et refuse toute saisie après soumission (`REPORT_LOCKED`).
 */
export function ManualEntryForm({ period, label, locked, rows }: ManualEntryFormProps) {
  const router = useRouter();
  const [values, setValues] = useState(() => Object.fromEntries(rows.map((row) => [row.code, toField(row.value)])));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [sending, setSending] = useState(false);
  // Verrouillé par le serveur (prop, relue après soumission) ou par un `REPORT_LOCKED` reçu ici. Dérivé de la prop :
  // Next conserve l'état d'une route déjà visitée (cacheComponents), un état initialisé une fois resterait périmé.
  const [lockedHere, setLockedHere] = useState(false);
  const readOnly = locked || lockedHere;

  const known = new Set(ENTRY_CARDS.flatMap((card) => card.groups));
  const cards = [
    ...ENTRY_CARDS.map((card) => ({ title: card.title, rows: rows.filter((row) => card.groups.includes(row.group)) })),
    { title: "Autres indicateurs", rows: rows.filter((row) => !known.has(row.group)) },
  ].filter((card) => card.rows.length > 0);

  async function save(validate: boolean) {
    setSending(true);
    setFeedback(null);
    setErrors({});
    const body = {
      values: rows.map((row) => ({ code: row.code, value: toValue(values[row.code], row.unit), note: row.note })),
    };
    let outcome: { ok: boolean; status: number; error?: unknown };
    try {
      const api = await getBrowserApi();
      const { error, response } = await api.PATCH("/api/backoffice/impact-reports/{period}/values/", {
        params: { path: { period } },
        body,
      });
      outcome = { ok: response.ok, status: response.status, error };
    } catch {
      outcome = { ok: false, status: 0, error: { code: "NETWORK_UNAVAILABLE", message: "" } };
    }
    setSending(false);

    if (outcome.ok) {
      router.refresh();
      const missing = rows.filter((row) => toValue(values[row.code], row.unit) === null);
      if (!validate) {
        setFeedback({ tone: "info", text: "Brouillon enregistré." });
      } else if (missing.length > 0) {
        setErrors(Object.fromEntries(missing.map((row) => [row.code, REQUIRED])));
        setFeedback({
          tone: "error",
          text:
            missing.length === 1
              ? "Saisie enregistrée, mais 1 indicateur reste à renseigner."
              : `Saisie enregistrée, mais ${missing.length} indicateurs restent à renseigner.`,
        });
      } else {
        setFeedback({ tone: "info", text: "Saisie validée : tous les indicateurs manuels sont renseignés.", complete: true });
      }
      return;
    }

    // Réponse sans corps JSON de l'API (vide, ou page HTML d'un proxy en 502) : traitée comme une panne du serveur
    const error = apiErrorBody(outcome.error) ?? { code: "SERVER_ERROR" as const, message: "" };
    if (outcome.status === 401 || error.code === "OTP_REQUIRED") {
      router.refresh();
      return;
    }
    if (error.code === "REPORT_LOCKED") {
      setLockedHere(true);
      setFeedback({ tone: "error", text: "Ce rapport a été soumis : la saisie n'est plus modifiable." });
      router.refresh();
      return;
    }
    if (error.code === "VALIDATION_ERROR") {
      const items = (error.fields?.values ?? []) as unknown as Array<Record<string, Array<{ message: string }>>>;
      setErrors(
        Object.fromEntries(
          items.flatMap((item, i) => {
            const messages = [...(item.value ?? []), ...(item.code ?? [])];
            return messages.length > 0 ? [[rows[i].code, messages.map((m) => m.message).join(" ")]] : [];
          }),
        ),
      );
      setFeedback({ tone: "error", text: "Certaines valeurs sont invalides : corrigez les champs signalés." });
      return;
    }
    setFeedback({
      tone: "error",
      text:
        error.code === "PERMISSION_DENIED"
          ? "Votre groupe ne peut pas saisir les indicateurs d'impact."
          : errorMessage({ code: error.code, message: error.message }, "vous"),
    });
  }

  // Entrée dans un champ : enregistre le brouillon (bouton par défaut)
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void save(false);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mx-auto flex max-w-220 flex-col gap-4">
      <Breadcrumb
        tone="ink"
        items={[
          { label: "Impact Tracker", href: routes.backoffice.impact },
          { label: `Rapport ${label}`, href: routes.backoffice.report(period) },
          { label: "Saisie manuelle" },
        ]}
      />

      {readOnly && (
        <p className={`${CARD} m-0 bg-ink-50 text-sm font-semibold text-ink-700`}>
          Le rapport {label} est soumis : la saisie est en lecture seule.
        </p>
      )}

      {cards.length === 0 ? (
        <p className={`${CARD} m-0 text-sm font-semibold text-ink-600`}>Aucun indicateur à saisir pour ce trimestre.</p>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
          {cards.map((card) => (
            <fieldset key={card.title} disabled={readOnly} className={`${CARD} m-0 min-w-0`}>
              <legend className="float-left mb-3.5 w-full p-0 text-[15px] font-extrabold text-ink-900">{card.title}</legend>
              <div className="clear-both flex flex-col gap-3.5">
                {card.rows.map((row) => (
                  <EntryField
                    key={row.code}
                    row={row}
                    value={values[row.code]}
                    error={errors[row.code]}
                    onChange={(value) => setValues((current) => ({ ...current, [row.code]: value }))}
                  />
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      )}

      {/* Régions live présentes dès le rendu : leur contenu, et non leur apparition, est annoncé */}
      <p role="status" className="m-0 text-sm font-bold text-ink-800 empty:hidden">
        {feedback?.tone === "info" && feedback.text}
        {feedback?.complete && (
          <>
            {" "}
            <Link href={routes.backoffice.report(period)} className={cx("rounded-sm underline", FOCUS)}>
              Revoir le rapport avant de le soumettre
            </Link>
          </>
        )}
      </p>
      <p role="alert" className="m-0 text-sm font-bold text-error-700 empty:hidden">
        {feedback?.tone === "error" && feedback.text}
      </p>

      {!readOnly && cards.length > 0 && (
        <div className="flex flex-wrap justify-end gap-2.5">
          <Button type="submit" variant="ink-outline" size="sm" disabled={sending}>
            Enregistrer le brouillon
          </Button>
          <Button variant="ink" size="sm" loading={sending} onClick={() => void save(true)}>
            Valider la saisie
          </Button>
        </div>
      )}
    </form>
  );
}

const INPUT = cx(
  "w-full rounded-[10px] border-[1.5px] border-ink-200 bg-surface px-3 py-2.5 text-sm font-semibold text-ink-900",
  "disabled:bg-ink-50 disabled:text-ink-700 aria-invalid:border-error-600",
  FOCUS,
);

/** Champ typé selon l'unité : nombre, note, oui / non, texte. */
function EntryField({
  row,
  value,
  error,
  onChange,
}: {
  row: Row;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const id = `kpi-${row.code}`;
  const errorId = `${id}-erreur`;
  const common = {
    id,
    name: row.code,
    value,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? errorId : undefined,
    className: INPUT,
  };
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-extrabold text-ink-800">
        {row.label}
        {UNIT_HINT[row.unit]}
      </label>
      {row.unit === "yes_no" ? (
        <select {...common} onChange={(event) => onChange(event.target.value)}>
          <option value="">Non renseigné</option>
          <option value="oui">Oui</option>
          <option value="non">Non</option>
        </select>
      ) : row.unit === "text" ? (
        <textarea {...common} rows={2} maxLength={500} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input
          {...common}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {error && (
        <p id={errorId} className="m-0 text-xs font-bold text-error-700">
          {error}
        </p>
      )}
    </div>
  );
}
