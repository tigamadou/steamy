import { NotFoundState } from "@/components/states";
import { routes } from "@/lib/routes";

/** 404 de l'espace parent (`notFound()` : enfant, demande ou commande d'une autre famille), dans le shell. */
export default function ParentNotFound() {
  return (
    <NotFoundState
      register="vous"
      headingLevel={2}
      action={{ label: "Retour à l'accueil", href: routes.parent.home }}
    />
  );
}
