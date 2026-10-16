import type { Metadata } from "next";

import { NotFoundState } from "@/components/states";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Kit introuvable" };

/** WK02 · 404 : kit inexistant ou retiré de la vente. */
export default function KitNotFound() {
  return (
    <NotFoundState
      title="Ce kit est introuvable"
      body="Il n'existe pas ou n'est plus en vente. D'autres kits vous attendent dans la boutique."
      action={{ label: "Voir tous les kits", href: routes.shop }}
    />
  );
}
