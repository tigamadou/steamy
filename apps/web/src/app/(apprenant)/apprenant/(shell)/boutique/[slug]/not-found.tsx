import { NotFoundState } from "@/components/states";
import { routes } from "@/lib/routes";

/** WK02 · 404 dans le shell (h2 sous le titre du header) : kit inexistant ou retiré de la vente. */
export default function LearnerKitNotFound() {
  return (
    <NotFoundState
      headingLevel={2}
      title="Ce kit est introuvable"
      body="Il n'existe pas ou n'est plus en vente. D'autres kits t'attendent dans la boutique."
      action={{ label: "Retour à la boutique", href: routes.learner.shop }}
    />
  );
}
