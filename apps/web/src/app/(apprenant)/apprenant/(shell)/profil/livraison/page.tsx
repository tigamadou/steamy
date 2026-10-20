import type { Metadata } from "next";
import { Suspense } from "react";

import { Delivery, DeliverySkeleton } from "@/features/account/Delivery";
import { ProfileBreadcrumb } from "@/features/account/ProfileBreadcrumb";

export const metadata: Metadata = { title: "Adresse de livraison" };

// WD19 · Adresse de livraison. Le h1 est le titre du header du shell (« Adresse de livraison »).
export default function DeliveryPage() {
  return (
    <div className="mx-auto flex w-full max-w-140 flex-col gap-4">
      <ProfileBreadcrumb current="Livraison" />
      <h2 className="m-0 text-lg font-black text-ink-900">Où te livrer un kit ?</h2>
      <p className="m-0 text-sm font-semibold text-ink-600">
        Cette adresse est proposée à ton parent quand il te commande un kit.
      </p>
      <Suspense fallback={<DeliverySkeleton />}>
        <Delivery />
      </Suspense>
    </div>
  );
}
