import { AdminContent, AdminHeader } from "@/components/backoffice/AdminHeader";
import { ImpactDashboard } from "@/components/backoffice/ImpactDashboard";
import { PeriodSwitch } from "@/components/backoffice/PeriodSwitch";
import { getServerApi } from "@/lib/api";
import { PAGE_GROUPS } from "@/lib/backoffice/access";
import { backofficeData } from "@/lib/backoffice/fetch";
import { requireGroups } from "@/lib/backoffice/guard";
import { impactPeriod } from "@/lib/backoffice/period";

export const metadata = { title: "Impact Tracker · Back-office" };

/**
 * WAD02 · Impact Tracker (Finance, Super-admin) : `GET backoffice/kpis/?period=`, période lue dans l'URL. Boutons
 * « Saisie manuelle » (WAD05) et « Rapport trimestriel » (WAD04) : livrés avec leurs pages, étape 6.9.
 */
export default async function ImpactPage({ searchParams }: PageProps<"/backoffice/impact">) {
  await requireGroups(PAGE_GROUPS.impact);
  const period = impactPeriod((await searchParams).periode);
  const api = await getServerApi();
  const dashboard = await backofficeData(
    api.GET("/api/backoffice/kpis/", { params: { query: { period: period.api } } }),
  );
  return (
    <>
      <AdminHeader title="Impact Tracker" actions={<PeriodSwitch value={period.id} />} />
      <AdminContent>
        <ImpactDashboard dashboard={dashboard} period={period.id} />
      </AdminContent>
    </>
  );
}
