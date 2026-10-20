import { NotFoundState } from "@/components/states";
import { routes } from "@/lib/routes";

/** WPD15 · demande d'une autre famille, inconnue ou supprimée : « Demande introuvable » (maquette de 4.0). */
export default function PaymentRequestNotFound() {
  return (
    <NotFoundState
      register="vous"
      headingLevel={2}
      title="Demande introuvable"
      body="Ce lien ne correspond à aucune demande de vos enfants. Vérifiez que vous êtes connecté avec le bon compte parent."
      action={{ label: "Voir mes demandes à valider", href: routes.parent.home }}
    />
  );
}
