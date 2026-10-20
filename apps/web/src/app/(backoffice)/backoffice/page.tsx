import { AdminContent, AdminHeader } from "@/components/backoffice/AdminHeader";
import { Overview } from "@/components/backoffice/Overview";
import { getServerApi } from "@/lib/api";
import { hasGroup, PAGE_GROUPS } from "@/lib/backoffice/access";
import { backofficeData } from "@/lib/backoffice/fetch";
import { requireGroups } from "@/lib/backoffice/guard";
import { publicApiUrl } from "@/lib/runtime-config";

export const metadata = { title: "Vue d'ensemble · Back-office" };

/** WAD01 · Vue d'ensemble (tout le personnel) : `GET backoffice/overview/`, « À traiter » filtré par le serveur. */
export default async function OverviewPage() {
  const me = await requireGroups(PAGE_GROUPS.overview);
  const api = await getServerApi();
  const overview = await backofficeData(api.GET("/api/backoffice/overview/"));
  return (
    <>
      <AdminHeader title="Vue d'ensemble" />
      <AdminContent>
        <Overview overview={overview} apiUrl={publicApiUrl()} canOpenImpact={hasGroup(me, PAGE_GROUPS.impact)} />
      </AdminContent>
    </>
  );
}
