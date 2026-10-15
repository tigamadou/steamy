import { AdminContent } from "@/components/backoffice/AdminHeader";
import { SkeletonBlock } from "@/components/ds/SkeletonBlock";
import { STATE_MESSAGES } from "@/components/states";

/** Chargement d'une page du back-office : skeleton de l'en-tête et des cartes, délai verbalisé (WX03). */
export default function BackofficeLoading() {
  return (
    <div role="status" aria-busy="true" className="flex flex-1 flex-col">
      <div className="flex min-h-15.5 items-center border-b border-ink-100 bg-surface px-4 sm:px-6.5">
        <SkeletonBlock className="h-6 w-56" />
      </div>
      <AdminContent>
        <p className="m-0 mb-4 text-sm font-semibold text-ink-600">{STATE_MESSAGES.loading.neutre.title}</p>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <SkeletonBlock key={i} className="h-28 rounded-[14px]" />
          ))}
        </div>
        <SkeletonBlock className="mt-4 h-48 rounded-2xl" />
      </AdminContent>
    </div>
  );
}
