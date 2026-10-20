import { NotFoundState } from "@/components/states";
import { routes } from "@/lib/routes";

/** WL23 / WD11 · 404 dans le shell : événement inexistant ou retiré du calendrier (h2 sous le titre du header). */
export default function LearnerEventNotFound() {
  return (
    <NotFoundState
      headingLevel={2}
      title="Cet événement est introuvable"
      body="Il a peut-être été retiré du calendrier. Retrouve tous les prochains rendez-vous Steamy."
      action={{ label: "Voir les événements", href: routes.learner.events }}
    />
  );
}
