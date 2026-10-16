import { redirect } from "next/navigation";
import { connection } from "next/server";

import { PAGE_GROUPS } from "@/lib/backoffice/access";
import { requireGroups } from "@/lib/backoffice/guard";
import { currentQuarterKey } from "@/lib/backoffice/period";
import { routes } from "@/lib/routes";

/** `/backoffice/impact/rapports` → rapport du trimestre en cours (WAD04). */
export default async function ReportsPage() {
  await requireGroups(PAGE_GROUPS.impact);
  await connection();
  redirect(routes.backoffice.report(currentQuarterKey()));
}
