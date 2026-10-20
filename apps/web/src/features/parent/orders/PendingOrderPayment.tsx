"use client";

import { useRouter } from "next/navigation";

import type { PaymentFormProps, PhoneCountry } from "@/components/ds";
import { OrderPayment } from "@/features/parent/payment-request/OrderPayment";
import { routes } from "@/lib/routes";

/** Reprise du paiement d'une commande en attente (WPD07 → détail) avec le formulaire de WPD15. */
export function PendingOrderPayment({
  reference,
  total,
  countries,
  preferred,
}: {
  reference: string;
  total: number;
  countries: PhoneCountry[];
  preferred: PaymentFormProps["preferred"];
}) {
  const router = useRouter();
  return (
    <OrderPayment
      amount={total}
      reference={async () => ({ ok: true, data: reference })}
      countries={countries}
      preferred={preferred}
      success={{
        message: <p className="m-0">Votre paiement est confirmé.</p>,
        action: { label: "Voir mes commandes", href: routes.parent.orders },
      }}
      onOrderClosed={() => router.refresh()}
    />
  );
}
