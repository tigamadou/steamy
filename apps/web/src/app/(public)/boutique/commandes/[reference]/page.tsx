import type { Metadata } from "next";
import { Suspense } from "react";

import { OrderTracking } from "@/features/checkout/OrderTracking";

// Lien SMS à jeton (C10) : jamais indexé, `Referrer-Policy: no-referrer` (aussi posé en en-tête par next.config.ts).
export const metadata: Metadata = {
  title: "Suivi de commande",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

async function Tracking({ params }: Pick<PageProps<"/boutique/commandes/[reference]">, "params">) {
  const { reference } = await params;
  return <OrderTracking reference={reference} />;
}

/** WK07 · Confirmation et suivi d'une commande de kits ; le jeton d'accès invité est lu dans le navigateur. */
export default function OrderPage({ params }: PageProps<"/boutique/commandes/[reference]">) {
  return (
    <div className="mx-auto w-full max-w-[720px] px-4 pt-8 pb-14 sm:px-8">
      <Suspense fallback={null}>
        <Tracking params={params} />
      </Suspense>
    </div>
  );
}
