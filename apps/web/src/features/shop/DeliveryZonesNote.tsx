import type { Schemas } from "@steamy/api-client";

import { Icon } from "@/components/ds";
import type { Register } from "@/lib/api-call";
import { formatPriceHt } from "@/lib/format";

/**
 * Délais et frais de livraison par zone (WK02, WK10), lus dans le référentiel des zones (D38) : aucun délai n'est
 * écrit en dur. Le choix de la zone se fait à la livraison (WK05).
 */
export function DeliveryZonesNote({ zones, register }: { zones: Schemas["DeliveryZone"][]; register: Register }) {
  return (
    <div className="rounded-[14px] bg-ink-50 p-3.5 text-[13px] font-semibold text-ink-700">
      <p className="flex items-center gap-2 font-extrabold text-ink-800">
        <Icon name="rocket" size={16} />
        {register === "tu" ? "Livraison selon ta zone" : "Livraison selon votre zone"}
      </p>
      <dl className="mt-2 flex flex-col gap-1.5">
        {zones.map((zone) => (
          <div key={zone.id} className="flex flex-wrap justify-between gap-x-3">
            <dt>{zone.name}</dt>
            <dd className="font-bold text-ink-900">
              {zone.delayLabel} · {formatPriceHt(zone.fee)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
