import type { Schemas } from "@steamy/api-client";
import { cacheLife, cacheTag } from "next/cache";

import type { KitCardData } from "@/components/ds";

import { getPublicApi } from "./api-public";
import { DIFFICULTY_LABELS, formatPrice } from "./format";
import { PublicApiError, unwrap } from "./public-api-error";

// Kits en vitrine (API-L1.5), en cache étiqueté `shop`. À appeler sous `<Suspense>`, après `connection()`.

export const KITS_PAGE_SIZE = 9;

export type KitPage = { results: Schemas["Kit"][]; hasNext: boolean };

export async function getKits({ category, page = 1 }: { category?: string; page?: number }): Promise<KitPage> {
  "use cache";
  cacheLife("minutes");
  cacheTag("shop");
  try {
    const data = unwrap(
      await getPublicApi().GET("/api/shop/kits/", { params: { query: { category, page, pageSize: KITS_PAGE_SIZE } } }),
    );
    return { results: data.results ?? [], hasNext: !!data.next };
  } catch (error) {
    // Page au-delà de la dernière : liste vide plutôt qu'une erreur
    if (error instanceof PublicApiError && error.status === 404) {
      return { results: [], hasNext: false };
    }
    throw error;
  }
}

/** Détail d'un kit (prix et disponibilité lus dans la boutique, D37) ; `null` s'il n'est plus en vente. */
export async function getKit(slug: string): Promise<Schemas["KitDetail"] | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("shop");
  const result = await getPublicApi().GET("/api/shop/kits/{slug}/", { params: { path: { slug } } });
  if (result.response.status === 404) {
    return null;
  }
  return unwrap(result);
}

/** Carte vitrine d'un kit : prix serveur, disponibilité booléenne (le stock exact reste interne). */
export function toKitCard(kit: Schemas["Kit"]): KitCardData {
  return {
    name: kit.name,
    difficulty: DIFFICULTY_LABELS[kit.difficulty],
    priceLabel: formatPrice(kit.price),
    availability: kit.available ? "in_stock" : "out_of_stock",
    color: kit.category.color,
    emoji: kit.emoji || kit.category.icon,
  };
}
