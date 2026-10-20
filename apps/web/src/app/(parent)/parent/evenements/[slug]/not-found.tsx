import { NotFoundState } from "@/components/states";
import { routes } from "@/lib/routes";

/** Événement inexistant ou dépublié, dans le shell parent. */
export default function ParentEventNotFound() {
  return (
    <NotFoundState
      register="vous"
      headingLevel={2}
      title="Cet événement est introuvable"
      body="Il n'existe pas ou n'est plus publié. Découvrez les prochains Steamy Events."
      action={{ label: "Voir les événements", href: routes.parent.events }}
    />
  );
}
