import { PAYMENT_STATUS } from "@/lib/backoffice/payments";

import { StatusBadge } from "../StatusBadge";

/** Pastille du statut Steamy d'un paiement ; un statut inconnu de l'écran s'affiche tel quel, au ton neutre. */
export function PaymentStatusBadge({ status }: { status: string }) {
  const known = (PAYMENT_STATUS as Record<string, (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS]>)[status];
  return <StatusBadge tone={known?.tone ?? "neutral"}>{known?.label ?? status}</StatusBadge>;
}
