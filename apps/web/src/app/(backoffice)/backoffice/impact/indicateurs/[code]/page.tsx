import { AdminContent, AdminHeader } from "@/components/backoffice/AdminHeader";
import { KpiDetail } from "@/components/backoffice/KpiDetail";
import { PeriodSwitch } from "@/components/backoffice/PeriodSwitch";
import { getServerApi } from "@/lib/api";
import { PAGE_GROUPS } from "@/lib/backoffice/access";
import { backofficeData } from "@/lib/backoffice/fetch";
import { requireGroups } from "@/lib/backoffice/guard";
import { impactPeriod } from "@/lib/backoffice/period";

export const metadata = { title: "Détail de l'indicateur · Back-office" };

/** WAD03 · Détail d'un indicateur (Finance, Super-admin) : `GET backoffice/kpis/{code}/?period=` ; code inconnu → 404. */
export default async function KpiPage({ params, searchParams }: PageProps<"/backoffice/impact/indicateurs/[code]">) {
  await requireGroups(PAGE_GROUPS.impact);
  const { code } = await params;
  const period = impactPeriod((await searchParams).periode);
  const api = await getServerApi();
  const kpi = await backofficeData(
    api.GET("/api/backoffice/kpis/{code}/", { params: { path: { code }, query: { period: period.api } } }),
  );
  return (
    <>
      <AdminHeader title="Détail de l'indicateur" actions={<PeriodSwitch value={period.id} />} />
      <AdminContent>
        <KpiDetail kpi={kpi} period={period.id} />
      </AdminContent>
    </>
  );
}
