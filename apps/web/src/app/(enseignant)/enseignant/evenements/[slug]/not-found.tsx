import { NotFoundState } from "@/components/states";
import { routes } from "@/lib/routes";

/** Événement inexistant ou dépublié, dans le shell enseignant. */
export default function TeacherEventNotFound() {
  return (
    <NotFoundState
      register="vous"
      headingLevel={2}
      title="Cet événement est introuvable"
      body="Il n'existe pas ou n'est plus publié. Découvrez les prochains Steamy Events."
      action={{ label: "Voir les événements", href: routes.teacher.events }}
    />
  );
}
