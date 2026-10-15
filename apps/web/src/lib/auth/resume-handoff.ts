/**
 * Identifiant transmis de W16 à la reprise d'inscription (C5) après `ACCOUNT_PENDING_CONSENT` : gardé en mémoire de
 * l'onglet le temps d'une navigation client, jamais dans l'URL ni dans le stockage du navigateur.
 */
let pending: string | null = null;

export function setResumeIdentifier(identifier: string): void {
  pending = identifier;
}

/** Lit l'identifiant transmis puis l'oublie. */
export function takeResumeIdentifier(): string | null {
  const identifier = pending;
  pending = null;
  return identifier;
}
