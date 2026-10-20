import { NotFoundState } from "@/components/states";
import { routes } from "@/lib/routes";

/** WK02 · 404 dans l'espace parent : kit inexistant ou retiré de la vente. */
export default function ParentKitNotFound() {
  return (
    <NotFoundState
      register="vous"
      headingLevel={2}
      title="Ce kit est introuvable"
      body="Il n'existe pas ou n'est plus en vente. D'autres kits vous attendent dans la boutique."
      action={{ label: "Retour à la boutique", href: routes.parent.shop }}
    />
  );
}
