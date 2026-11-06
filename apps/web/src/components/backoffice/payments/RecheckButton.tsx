"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ds/Button";
import { errorMessage } from "@/lib/api-call";
import { labelOf, PAYMENT_STATUS } from "@/lib/backoffice/payments";

import { callWithStatus } from "./call";

export type RecheckButtonProps = { paymentId: number; status: string };

type Feedback = { tone: "info" | "error"; text: string };

const STATUS_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(PAYMENT_STATUS).map(([code, { label }]) => [code, label]),
);

/**
 * « Revérifier chez FedaPay » : relit la transaction chez le prestataire (`POST …/recheck/`). Le bouton n'existe que
 * pour un paiement non réussi ; les messages restent affichés même quand la revérification règle le paiement.
 */
export function RecheckButton({ paymentId, status }: RecheckButtonProps) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  async function recheck() {
    setSending(true);
    setFeedback(null);
    const { result } = await callWithStatus((api) =>
      api.POST("/api/backoffice/payments/{id}/recheck/", { params: { path: { id: paymentId } } }),
    );
    setSending(false);
    if (result.ok) {
      router.refresh();
      setFeedback({ tone: "info", text: `Paiement revérifié : statut ${labelOf(STATUS_LABELS, result.data.status)}.` });
      return;
    }
    if (result.code === "NOT_AUTHENTICATED" || result.code === "OTP_REQUIRED") {
      router.refresh();
      return;
    }
    setFeedback({
      tone: "error",
      text:
        result.code === "NETWORK_UNAVAILABLE"
          ? errorMessage(result, "vous")
          : result.message || "La vérification a échoué. Réessayez.",
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      {status !== "succeeded" && (
        <Button variant="ink-outline" size="sm" loading={sending} onClick={() => void recheck()}>
          Revérifier chez FedaPay
        </Button>
      )}
      {/* Régions live présentes dès le rendu : leur contenu, et non leur apparition, est annoncé */}
      <p role="status" className="m-0 text-sm font-bold text-ink-800 empty:hidden">
        {feedback?.tone === "info" && feedback.text}
      </p>
      <p role="alert" className="m-0 text-sm font-bold text-error-700 empty:hidden">
        {feedback?.tone === "error" && feedback.text}
      </p>
    </div>
  );
}
