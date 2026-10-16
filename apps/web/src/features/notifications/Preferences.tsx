import { SkeletonBlock } from "@/components/ds";
import { getServerApi } from "@/lib/api";
import { readOrNull } from "@/lib/api-read";

import { PreferencesForm } from "./PreferencesForm";

/** Squelette de WD06 : onglets, deux canaux et cinq catégories. */
export function PreferencesSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Chargement de tes préférences…"
      className="mx-auto flex w-full max-w-180 flex-col gap-2"
    >
      <SkeletonBlock className="mb-4 h-10 w-56 rounded-pill" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <SkeletonBlock key={i} className="h-18 rounded-lg" />
      ))}
    </div>
  );
}

/** WD06 · préférences lues côté serveur (`GET notifications/preferences/`). */
export async function Preferences() {
  const data = readOrNull(await (await getServerApi()).GET("/api/notifications/preferences/"));
  return data && <PreferencesForm initial={data} />;
}
