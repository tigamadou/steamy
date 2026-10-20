import { SkeletonBlock } from "@/components/ds";
import { getDeliveryAddress } from "@/features/account/api";
import { getServerApi } from "@/lib/api";
import { readOrNull } from "@/lib/api-read";
import { getCurrentUser } from "@/lib/auth/session";
import { getCountries } from "@/lib/referentials";

import { ParentKitCheckout } from "./ParentKitCheckout";

/** Enfants lus pour le choix du bénéficiaire : une famille en compte rarement plus. */
const KIDS_PAGE_SIZE = 50;

/** Commande d'un achat direct de kit, côté serveur : adresse et Mobile Money préférés (WPD08), enfants actifs. */
export async function ParentKitCheckoutScreen() {
  const api = await getServerApi();
  const [me, profile, children, address, countries] = await Promise.all([
    getCurrentUser(),
    api.GET("/api/accounts/me/parent-profile/"),
    api.GET("/api/accounts/children/", { params: { query: { pageSize: KIDS_PAGE_SIZE } } }),
    getDeliveryAddress(),
    getCountries(),
  ]);
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
