import { Button } from "@/components/ds/Button";
import { Mascot } from "@/components/ds/Mascot";
import { WebShell } from "@/components/ds/WebShell";

/** Activation impossible (`INVITATION_INVALID`, lien incomplet) : contact WL24, sans détail sur l'invitation. */
export function InvalidInvitation() {
  return (
    <WebShell
      kicker="Activation du compte"
      title="Lien expiré ou déjà utilisé"
      sub="Ce lien d'activation n'est plus valable. Demandez une nouvelle invitation à votre établissement ou contactez l'équipe Steamy."
      brand={<Mascot pose="sad" size={200} hue="var(--surface)" />}
    >
      <Button href="/aide?sujet=question#contact" block size="lg">
        Contacter l&apos;équipe Steamy
      </Button>
      <Button href="/connexion" variant="outline" block>
        Se connecter
      </Button>
    </WebShell>
  );
}
