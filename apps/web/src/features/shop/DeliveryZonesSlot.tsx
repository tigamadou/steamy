import { connection } from "next/server";

import type { Register } from "@/lib/api-call";
import { getDeliveryZones } from "@/lib/shop";

import { DeliveryZonesNote } from "./DeliveryZonesNote";

/**
 * Délais par zone lus côté serveur (en cache) pour le panier vide (WK10), à la requête et sous `<Suspense>` (l'API
 * n'est pas joignable au build) ; rien si les zones sont indisponibles.
 */
export async function DeliveryZonesSlot({ register }: { register: Register }) {
  await connection();
  const zones = await getDeliveryZones().catch(() => []);
  return zones.length > 0 ? <DeliveryZonesNote zones={zones} register={register} /> : null;
}
