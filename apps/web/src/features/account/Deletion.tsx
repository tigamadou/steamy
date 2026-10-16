import { SkeletonBlock } from "@/components/ds/SkeletonBlock";

import { AccountDeletion } from "./AccountDeletion";
import { getDeletionRequest } from "./api";

/** WD15, côté serveur : dernière demande de suppression (ou aucune), sous `<Suspense>`. */
export async function Deletion() {
  return <AccountDeletion initial={await getDeletionRequest()} />;
}

/** Squelette fidèle à WD15. */
export function DeletionSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Chargement de ta demande…">
      <SkeletonBlock className="h-100 rounded-[22px]" />
    </div>
  );
}
