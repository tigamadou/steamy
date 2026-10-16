import { AdminContent, AdminHeader } from "@/components/backoffice/AdminHeader";
import { ManualEntryForm } from "@/components/backoffice/ManualEntryForm";
import { getServerApi } from "@/lib/api";
import { PAGE_GROUPS } from "@/lib/backoffice/access";
import { backofficeData } from "@/lib/backoffice/fetch";
import { requireGroups } from "@/lib/backoffice/guard";

export const metadata = { title: "Saisie des indicateurs manuels · Back-office" };

/** WAD05 · Saisie manuelle (Finance, Super-admin) : lignes `manual` du rapport ; lecture seule une fois soumis (D74). */
export default async function ManualEntryPage({ params }: PageProps<"/backoffice/impact/rapports/[periode]/saisie">) {
  await requireGroups(PAGE_GROUPS.impact);
  const { periode } = await params;
  const api = await getServerApi();
  const report = await backofficeData(
    api.GET("/api/backoffice/impact-reports/{period}/", { params: { path: { period: periode } } }),
  );
  return (
    <>
      <AdminHeader title="Saisie des indicateurs manuels" />
      <AdminContent>
        <ManualEntryForm
          period={report.period}
          label={report.label}
          locked={report.status === "submitted"}
          rows={report.rows.filter((row) => row.source === "manual")}
        />
      </AdminContent>
    </>
  );
}
