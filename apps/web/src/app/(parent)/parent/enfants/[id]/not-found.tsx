import { NotFoundState } from "@/components/states";
import { routes } from "@/lib/routes";

/** WPD03 / WPD10 · enfant inexistant ou rattaché à un autre parent : « introuvable », sans distinguer « interdit ». */
export default function ChildNotFound() {
  return (
    <NotFoundState
      register="vous"
      headingLevel={2}
      title="Cet enfant est introuvable"
      body="Ce profil n'existe pas ou n'est pas rattaché à votre compte. Retrouvez vos enfants dans votre espace."
      action={{ label: "Voir mes enfants", href: routes.parent.children }}
    />
  );
}
