import { AdminContent, AdminHeader } from "@/components/backoffice/AdminHeader";
import { ImpactReport } from "@/components/backoffice/ImpactReport";
import { SubmitReport } from "@/components/backoffice/SubmitReport";
import { Button } from "@/components/ds/Button";
import { getServerApi } from "@/lib/api";
import { PAGE_GROUPS } from "@/lib/backoffice/access";
import { backofficeData } from "@/lib/backoffice/fetch";
import { requireGroups } from "@/lib/backoffice/guard";
import { publicApiUrl } from "@/lib/runtime-config";
import { routes } from "@/lib/routes";

export const metadata = { title: "Rapport d'impact trimestriel · Back-office" };

/** WAD04 · Rapport trimestriel (Finance, Super-admin) : `GET backoffice/impact-reports/{period}/` ; trimestre inconnu → 404. */
export default async function ReportPage({ params }: PageProps<"/backoffice/impact/rapports/[periode]">) {
  await requireGroups(PAGE_GROUPS.impact);
  const { periode } = await params;
  const api = await getServerApi();
  const report = await backofficeData(
    api.GET("/api/backoffice/impact-reports/{period}/", { params: { path: { period: periode } } }),
  );
  const draft = report.status === "draft";
  return (
    <>
      <AdminHeader
        title="Rapport d'impact trimestriel"
        actions={
          <>
            <Button href={routes.backoffice.reportEntry(report.period)} variant="ink-outline" size="sm">
              {draft ? "Saisie manuelle" : "Voir la saisie"}
            </Button>
            {draft && (
              <SubmitReport period={report.period} label={report.label} entered={report.entered} total={report.total} />
            )}
          </>
        }
      />
      <AdminContent>
        <ImpactReport report={report} apiUrl={publicApiUrl()} />
      </AdminContent>
    </>
  );
}
