import { NotFoundState } from "@/components/states";
import { routes } from "@/lib/routes";

/** WPD05 · 404 : demande inconnue ou adressée à un autre numéro (`CONSENT_PHONE_MISMATCH` jamais divulgué). */
export default function ConsentRequestNotFound() {
  return (
    <NotFoundState
      register="vous"
      headingLevel={2}
      title="Demande introuvable"
      body="Cette demande n'existe pas ou n'est pas adressée à votre numéro. Retrouvez celles qui vous attendent sur votre accueil."
      action={{ label: "Retour à l'accueil", href: routes.parent.home }}
    />
  );
}
