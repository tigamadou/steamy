import { cx } from "@/lib/cx";

import { Avatar } from "../Avatar";
import { Badge } from "../Badge";

export type ConsentRequestCardProps = {
  /** Champs autorisés par D20, et eux seuls : prénom, nom, identifiant, âge, lien de parenté. */
  firstName: string;
  lastName: string;
  username: string | null;
  age: number | null;
  /** Lien de parenté vu par le parent (« Vous êtes sa mère », référentiel `relationships`). */
  relationship: string;
  /** Date d'expiration de la demande, déjà mise en forme. */
  expiresOn: string;
  className?: string;
};

/**
 * Carte de la demande de consentement (WP05, réutilisée par WPD05 au lot 4) : initiales (pas d'avatar), identité,
 * identifiant, âge et lien de parenté — rien d'autre n'existe à ce stade (D20) —, badge « En attente », expiration
 * et engagement sur l'usage des données.
 */
export function ConsentRequestCard({
  firstName,
  lastName,
  username,
  age,
  relationship,
  expiresOn,
  className,
}: ConsentRequestCardProps) {
  const name = `${firstName} ${lastName}`;
  return (
    <article
      aria-label={`Demande de ${name}`}
      className={cx("flex flex-col gap-4 rounded-2xl border-2 border-ink-100 bg-surface p-5", className)}
    >
      <div className="flex items-center gap-4">
        <Avatar name={name} size={56} color="var(--primary-500)" decorative />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-black text-ink-900">{name}</h2>
          <p className="text-sm font-semibold text-ink-600">
            {[username && `@${username}`, age && `${age} ans`].filter(Boolean).join(" · ")}
          </p>
        </div>
        <Badge tone="amber">En attente</Badge>
      </div>
      <p className="font-bold text-ink-800">{relationship}</p>
      <p className="text-sm font-semibold text-ink-600">Demande valable jusqu&apos;au {expiresOn}.</p>
      <p className="flex items-start gap-2.5 rounded-lg bg-info-50 p-3.5 text-sm font-bold text-info-700">
        <span aria-hidden>🔒</span>
        Les données ne servent qu&apos;au suivi pédagogique, jamais à du marketing.
      </p>
    </article>
  );
}
