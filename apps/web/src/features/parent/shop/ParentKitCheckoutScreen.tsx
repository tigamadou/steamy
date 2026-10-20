import type { Schemas } from "@steamy/api-client";

import { SkeletonBlock } from "@/components/ds";
import { getDeliveryAddress } from "@/features/account/api";
import { getServerApi } from "@/lib/api";
import { readOrNull } from "@/lib/api-read";
import { getCurrentUser } from "@/lib/auth/session";
import { getCountries } from "@/lib/referentials";

import { ParentKitCheckout } from "./ParentKitCheckout";

/** Enfants lus pour le choix du bénéficiaire : une famille en compte rarement plus. */
const KIDS_PAGE_SIZE = 50;

/** Commande de kit en attente de paiement et encore réservée, la première de la liste. */
function pendingKitOrder(orders: Schemas["Order"][]): Schemas["Order"] | null {
  const now = Date.now();
  return orders.find((order) => order.kind === "kit" && order.expiresAt && Date.parse(order.expiresAt) > now) ?? null;
}

/**
 * Commande d'un achat direct de kit, côté serveur : adresse et Mobile Money préférés (WPD08), enfants actifs, et
 * commande de kit déjà en attente (reprise proposée au lieu d'une seconde commande).
 */
export async function ParentKitCheckoutScreen() {
  const api = await getServerApi();
  const [me, profile, children, address, countries, pending] = await Promise.all([
    getCurrentUser(),
    api.GET("/api/accounts/me/parent-profile/"),
    api.GET("/api/accounts/children/", { params: { query: { pageSize: KIDS_PAGE_SIZE } } }),
    getDeliveryAddress(),
    getCountries(),
    api.GET("/api/payments/orders/", { params: { query: { status: "pending" } } }),
  ]);
  const pendingOrder = pendingKitOrder(readOrNull(pending)?.results ?? []);
  const parent = readOrNull(profile);
  const list = readOrNull(children);
  if (!me || !parent || !list) return null;
  return (
    <ParentKitCheckout
      address={address}
      defaultCountry={parent.locality?.country ?? ""}
      parentName={`${me.firstName} ${me.lastName}`.trim()}
      kids={(list.results ?? []).filter((child) => child.status === "active")}
      countries={countries}
      preferred={parent.mobileMoney}
      pendingOrder={pendingOrder && { reference: pendingOrder.reference, expiresAt: pendingOrder.expiresAt }}
    />
  );
}

/** Squelette de la commande. */
export function ParentKitCheckoutSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Chargement de votre commande…" className="mx-auto flex w-full max-w-180 flex-col gap-4">
      <SkeletonBlock className="h-40 rounded-[22px]" />
      <SkeletonBlock className="h-96 rounded-[22px]" />
    </div>
  );
}
