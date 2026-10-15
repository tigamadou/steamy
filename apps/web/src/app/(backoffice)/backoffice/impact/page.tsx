import { AdminContent, AdminHeader } from "@/components/backoffice/AdminHeader";
import { PendingPanel } from "@/components/backoffice/PendingPanel";
import { PAGE_GROUPS } from "@/lib/backoffice/access";
import { requireGroups } from "@/lib/backoffice/guard";

export const metadata = { title: "Impact Tracker · Back-office" };

/** WAD02 · Impact Tracker (Finance, Super-admin). Contenu livré à l'étape 6.8 avec `GET backoffice/kpis/`. */
export default async function ImpactPage() {
  await requireGroups(PAGE_GROUPS.impact);
  return (
    <>
      <AdminHeader title="Impact Tracker" />
      <AdminContent>
        <PendingPanel
          kicker="Impact Tracker"
          title="Indicateurs en préparation"
          text="Les indicateurs d'impact, leur statut et le rapport trimestriel s'afficheront ici."
        />
      </AdminContent>
    </>
  );
}
