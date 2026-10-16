import { AdminContent, AdminHeader } from "@/components/backoffice/AdminHeader";
import { ImpactDashboard } from "@/components/backoffice/ImpactDashboard";
import { PeriodSwitch } from "@/components/backoffice/PeriodSwitch";
import { Button } from "@/components/ds/Button";
import { getServerApi } from "@/lib/api";
import { PAGE_GROUPS } from "@/lib/backoffice/access";
import { backofficeData } from "@/lib/backoffice/fetch";
import { requireGroups } from "@/lib/backoffice/guard";
import { currentQuarterKey, impactPeriod } from "@/lib/backoffice/period";
import { routes } from "@/lib/routes";

export const metadata = { title: "Impact Tracker · Back-office" };

/**
 * WAD02 · Impact Tracker (Finance, Super-admin) : `GET backoffice/kpis/?period=`, période lue dans l'URL ; « Saisie
 * manuelle » (WAD05) et « Rapport trimestriel » (WAD04) ouvrent le trimestre en cours.
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
      <AdminHeader
        title="Impact Tracker"
        actions={
          <>
            <Button href={routes.backoffice.reportEntry(currentQuarterKey())} variant="ink-outline" size="sm">
              Saisie manuelle
            </Button>
            <Button href={routes.backoffice.reports} variant="ink" size="sm">
              Rapport trimestriel
            </Button>
            <PeriodSwitch value={period.id} />
          </>
        }
      />
      <AdminContent>
        <ImpactDashboard dashboard={dashboard} period={period.id} />
      </AdminContent>
    </>
  );
}
