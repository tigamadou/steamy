import type { Metadata } from "next";
import { Suspense } from "react";

import { CartView } from "@/features/shop/CartView";
import { DeliveryZonesSlot } from "@/features/shop/DeliveryZonesSlot";

export const metadata: Metadata = { title: "Votre panier", robots: { index: false, follow: false } };

/**
 * WK03 / WK10 · Panier de l'invité (D12, D38), lu dans le navigateur : la page reste statique. Un apprenant connecté
 * est renvoyé vers son panier.
 */
export default function CartPage() {
  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 pt-10 pb-14 sm:px-8">
      <h1 className="mb-6 text-[30px] font-black text-ink-900 sm:text-4xl">Votre panier</h1>
      <CartView
        context="public"
        zones={
          <Suspense fallback={null}>
            <DeliveryZonesSlot register="vous" />
          </Suspense>
        }
      />
    </div>
  );
}
