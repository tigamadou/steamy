"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

import { IMPACT_PERIODS, withPeriod, type ImpactPeriodId } from "@/lib/backoffice/period";

import { SegmentedControl } from "./SegmentedControl";

/**
 * Mois / Trimestre / Année de l'Impact Tracker (WAD02, WAD03) : la période vit dans l'URL (`?periode=`), la page
 * serveur relit donc les valeurs de l'API à chaque changement (rien n'est recalculé ici).
 */
export function PeriodSwitch({ value }: { value: ImpactPeriodId }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  return (
    <div aria-busy={pending} className={pending ? "opacity-60" : undefined}>
      <SegmentedControl
        label="Période"
        value={value}
        options={IMPACT_PERIODS.map(({ id, label }) => ({ id, label }))}
        onChange={(id) => startTransition(() => router.push(withPeriod(pathname, id as ImpactPeriodId)))}
      />
    </div>
  );
}
