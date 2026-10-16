"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Modal } from "@/components/ds/Modal";
import { apiCall, errorMessage } from "@/lib/api-call";

import { BUTTON_DARK, BUTTON_OUTLINE } from "./styles";

export type SubmitReportProps = {
  /** Trimestre, au format de l'API (`2026-t4`). */
  period: string;
  label: string;
  entered: number;
  total: number;
};

/**
 * « Soumettre » (WAD04, D74) : confirmation, puis `POST …/submit/` ; le rapport est alors verrouillé et la page
 * relue côté serveur. Session non vérifiée ou rapport déjà soumis : la relecture de la page fait foi.
 */
export function SubmitReport({ period, label, entered, total }: SubmitReportProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const missing = total - entered;

  async function submit() {
    setSending(true);
    setError("");
    const result = await apiCall((api) =>
      api.POST("/api/backoffice/impact-reports/{period}/submit/", { params: { path: { period } } }),
    );
    setSending(false);
    if (result.ok || result.code === "REPORT_LOCKED" || result.code === "OTP_REQUIRED") {
      setOpen(false);
      router.refresh();
      return;
    }
    setError(
      result.code === "PERMISSION_DENIED"
        ? "Votre groupe ne peut pas soumettre le rapport d'impact."
        : errorMessage(result, "vous"),
    );
  }

  return (
    <>
      <button type="button" className={BUTTON_DARK} onClick={() => setOpen(true)}>
        Soumettre
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Soumettre le rapport ${label} ?`}
        actions={
          <>
            <button type="button" className={BUTTON_OUTLINE} onClick={() => setOpen(false)}>
              Annuler
            </button>
            <button type="button" className={BUTTON_DARK} onClick={submit} disabled={sending} aria-busy={sending}>
              {sending ? "Soumission…" : "Soumettre le rapport"}
            </button>
          </>
        }
      >
        <p className="m-0">
          Une fois soumis, le rapport est verrouillé : ses valeurs ne pourront plus être modifiées.
        </p>
        {missing > 0 && (
          <p className="m-0 mt-2 font-bold text-ink-800">
            {missing === 1
              ? "1 indicateur manuel n'est pas renseigné."
              : `${missing} indicateurs manuels ne sont pas renseignés.`}
          </p>
        )}
        {error && (
          <p role="alert" className="m-0 mt-3 font-bold text-error-700">
            {error}
          </p>
        )}
      </Modal>
    </>
  );
}
