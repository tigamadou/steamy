import type { ReactNode } from "react";

import { backofficeNav } from "@/lib/backoffice/access";
import { backofficeLoginUrl, requireStaff } from "@/lib/backoffice/guard";
import { publicApiUrl } from "@/lib/runtime-config";
import { routes } from "@/lib/routes";

import { AdminShell } from "./AdminShell";

/** Garde et shell du back-office (layout `(backoffice)`, sous `<Suspense>`) : personnel vérifié par TOTP. */
export async function BackofficeGate({ children }: { children: ReactNode }) {
  const me = await requireStaff();
  const name = `${me.firstName} ${me.lastName}`.trim() || me.email || "Personnel";
  return (
    <AdminShell
      user={{ name, groups: me.staffGroups.join(" · ") || "Personnel" }}
      nav={backofficeNav(me, publicApiUrl())}
      loginUrl={await backofficeLoginUrl(routes.backoffice.home)}
    >
      {children}
    </AdminShell>
  );
}
