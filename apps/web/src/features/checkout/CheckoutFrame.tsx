import type { ReactNode } from "react";

import { Breadcrumb, ProgressSteps } from "@/components/ds";
import { routes } from "@/lib/routes";

const STEPS = [
  { label: "Vos coordonnées", href: routes.checkout.guest },
  { label: "Livraison", href: routes.checkout.delivery },
  { label: "Paiement", href: routes.checkout.payment },
] as const;

/**
 * Cadre des écrans du tunnel invité (WK04 → WK06, D12), dans le shell public : fil d'Ariane depuis le panier,
 * progression en trois étapes et titre de l'étape (h1).
 */
export function CheckoutFrame({ step, title, children }: { step: 1 | 2 | 3; title: string; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[600px] px-4 pt-8 pb-14 sm:px-8">
      <Breadcrumb
        className="mb-4"
        items={[
          { label: "Panier", href: routes.cart },
          ...STEPS.slice(0, step - 1).map(({ label, href }) => ({ label, href })),
          { label: STEPS[step - 1].label },
        ]}
      />
      <ProgressSteps step={step} total={STEPS.length} label={`Étape ${step} sur ${STEPS.length} : ${STEPS[step - 1].label}`} />
      <h1 className="mt-6 mb-5 text-[26px] font-black text-ink-900 sm:text-[30px]">{title}</h1>
      {children}
    </div>
  );
}
