import { NotFoundState } from "@/components/states";
import { routes } from "@/lib/routes";

/** Commande inconnue ou d'un autre payeur : « Commande introuvable », sans distinguer « interdit ». */
export default function ParentOrderNotFound() {
  return (
    <NotFoundState
      register="vous"
      headingLevel={2}
      title="Commande introuvable"
      body="Cette commande n'existe pas ou n'a pas été passée depuis votre compte."
      action={{ label: "Voir mes commandes", href: routes.parent.orders }}
    />
  );
}
