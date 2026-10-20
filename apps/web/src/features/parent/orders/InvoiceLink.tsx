import type { Schemas } from "@steamy/api-client";

import { Button } from "@/components/ds";
import { publicApiUrl } from "@/lib/runtime-config";

/**
 * « Facture » d'une commande payée (WPD07), réservée au payeur (C12). Lien direct vers l'API : le navigateur suit la
 * redirection vers l'URL signée du PDF (un `fetch` serait bloqué par le stockage, sur une autre origine). Tant que le
 * PDF n'est pas prêt (`invoice.pdfStatus`), la facture est annoncée en préparation.
 */
export function InvoiceLink({
  reference,
  invoice,
  label = "Facture",
}: {
  reference: string;
  invoice: Schemas["InvoiceSummary"] | null;
  label?: string;
}) {
  if (invoice?.pdfStatus !== "ready") {
    return <p className="m-0 text-xs font-bold text-ink-600">Facture en préparation</p>;
  }
  return (
    <Button
      variant="outline"
      size="sm"
      href={`${publicApiUrl()}/api/payments/orders/${encodeURIComponent(reference)}/invoice/`}
    >
      {label}
      <span className="sr-only"> de la commande {reference}</span>
    </Button>
  );
}
