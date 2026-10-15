import { Button } from "@/components/ds";
import { routes } from "@/lib/routes";
import { cx } from "@/lib/cx";

export type NavAccountProps = {
  /** Boutons pleine largeur, empilés (menu mobile). */
  stacked?: boolean;
};

/**
 * Emplacement du compte dans la navigation publique. Visiteur : « Se connecter » et « Créer un compte ».
 * Le lot 2 y branche l'accès à l'espace du visiteur connecté, côté client, sans rendre la page dynamique.
 */
export function NavAccount({ stacked }: NavAccountProps) {
  return (
    <div className={cx("flex gap-2", stacked && "flex-col")}>
      <Button variant="ghost" href={routes.login()} block={stacked}>
        Se connecter
      </Button>
      <Button href={routes.signup()} block={stacked}>
        Créer un compte
      </Button>
    </div>
  );
}
