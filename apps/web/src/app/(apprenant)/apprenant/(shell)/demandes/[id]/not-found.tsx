import { NotFoundState } from "@/components/states";
import { routes } from "@/lib/routes";

/** WA02 · 404 : demande inexistante ou d'un autre apprenant, dans le shell (h2 sous le titre du header). */
export default function PaymentRequestNotFound() {
  return (
    <NotFoundState
      headingLevel={2}
      title="Cette demande est introuvable"
      body="Elle n'existe pas ou ne t'appartient pas. Retrouve tes demandes en cours dans « Mes commandes »."
      action={{ label: "Voir mes commandes", href: routes.learner.orders }}
    />
  );
}
