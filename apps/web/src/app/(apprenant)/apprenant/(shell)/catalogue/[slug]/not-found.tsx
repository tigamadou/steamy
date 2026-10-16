import { NotFoundState } from "@/components/states";
import { routes } from "@/lib/routes";

/** WC04 · 404 : parcours inexistant ou non publié, dans le shell (h2 sous le titre du header). */
export default function LearnerCourseNotFound() {
  return (
    <NotFoundState
      headingLevel={2}
      title="Ce parcours est introuvable"
      body="Il n'existe pas ou n'est plus publié. Plein d'autres parcours t'attendent dans le catalogue."
      action={{ label: "Retour au catalogue", href: routes.learner.catalog }}
    />
  );
}
