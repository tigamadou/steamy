import { NotFoundState } from "@/components/states";
import { routes } from "@/lib/routes";

/**
 * 404 de l'espace enseignant (`notFound()` : classe, élève ou parcours hors de ses classes), dans le shell. Jamais un
 * 403, qui révélerait l'existence de l'objet.
 */
export default function TeacherNotFound() {
  return (
    <NotFoundState
      register="vous"
      headingLevel={2}
      action={{ label: "Retour à l'accueil", href: routes.teacher.home }}
    />
  );
}
