"use client";

import { useState } from "react";

import { Button } from "@/components/ds";
import { getInvoice } from "@/features/checkout/api";
import { errorMessage } from "@/lib/api-call";

/**
 * « Facture » d'une commande payée (WPD07), réservée au payeur (C12) : le PDF est téléchargé ; tant qu'il est en
 * préparation (`PDF_NOT_READY`), un message invite à réessayer.
 */
export function InvoiceButton({ reference, label = "Facture" }: { reference: string; label?: string }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();

  async function download() {
    setPending(true);
    setMessage(undefined);
    const result = await getInvoice(reference, null);
    setPending(false);
    if (!result.ok) {
      setMessage(
        result.code === "PDF_NOT_READY"
          ? "La facture est en cours de préparation. Réessayez dans un instant."
          : errorMessage(result, "vous"),
      );
      return;
    }
    const url = URL.createObjectURL(result.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = `facture-${reference}.pdf`;
    link.click();
    // Libérée après coup : certains navigateurs lisent l'URL après le clic
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" size="sm" loading={pending} onClick={() => void download()}>
        {label}
        <span className="sr-only"> de la commande {reference}</span>
      </Button>
      {message && (
        <p role="alert" className="m-0 text-xs font-bold text-error-700">
          {message}
        </p>
      )}
    </div>
  );
}
