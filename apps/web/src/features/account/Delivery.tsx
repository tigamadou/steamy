import { SkeletonBlock } from "@/components/ds/SkeletonBlock";
import { getCurrentUser } from "@/lib/auth/session";

import { getDeliveryAddress, getLearnerProfile } from "./api";
import { DeliveryForm } from "./DeliveryForm";

/**
 * WD19, côté serveur : adresse enregistrée (ou aucune), pays par défaut tiré de la localité du profil, nom de
 * l'apprenant comme destinataire. Sous `<Suspense>`.
 */
export async function Delivery() {
  const [me, profile, address] = await Promise.all([getCurrentUser(), getLearnerProfile(), getDeliveryAddress()]);
  // Sans session, la garde de rôle du layout redirige.
  if (!me) return null;
  return (
    <DeliveryForm
      address={address}
      defaultCountry={profile.locality?.country ?? ""}
      recipientName={`${me.firstName} ${me.lastName}`.trim()}
    />
  );
}

/** Squelette fidèle à WD19. */
export function DeliverySkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Chargement de ton adresse…">
      <SkeletonBlock className="h-110 rounded-[18px]" />
    </div>
  );
}
