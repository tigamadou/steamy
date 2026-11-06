import type { Schemas } from "@steamy/api-client";

import { formatKpiValue } from "@/lib/backoffice/format";

import { StatCard } from "../StatCard";
import { formatNumber } from "../styles";

/** Totaux du filtre entier (pas de la page), tels que l'API les calcule ; une valeur absente s'affiche « — ». */
export function PaymentTotals({ totals }: { totals: Schemas["PaymentTotals"] }) {
  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Volume encaissé" value={formatKpiValue(totals.volume, "fcfa")} sub="paiements réussis" />
      <StatCard label="Paiements" value={formatNumber(totals.count)} sub="correspondant aux filtres" />
      <StatCard label="Réussis / échoués" value={`${formatNumber(totals.succeeded)} / ${formatNumber(totals.failed)}`} />
      <StatCard
        label="Taux d'échec"
        value={totals.failureRate === null ? undefined : `${formatNumber(totals.failureRate)} %`}
        sub={totals.failureRate === null ? "aucun paiement réglé" : "échoués sur réglés"}
      />
    </div>
  );
}
