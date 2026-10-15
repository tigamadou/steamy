/**
 * Retour après connexion (`?next=`, README des plans) : seuls les chemins internes des espaces et des pages qui
 * demandent une connexion sont acceptés. Tout le reste (URL absolue, `//hôte`, `\`, schéma, chemin hors liste
 * blanche, retour vers la connexion elle-même) est ignoré au profit de l'espace du rôle.
 */
const ALLOWED_PREFIXES = [
  "/apprenant",
  "/parent",
  "/enseignant",
  "/backoffice",
  "/parcours",
  "/evenements",
  "/boutique",
  "/consentement",
  "/inscription/parent/demande",
] as const;

// Origine fictive : sert seulement à faire résoudre le chemin par le navigateur (`..`, `%2e`…)
const BASE = "http://steamy.invalid";

export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || /[\\\s]/.test(next)) {
    return null;
  }
  // Chemin résolu (`..`, `%2e`, `/.//`) puis comparé à la liste blanche : le résultat commence toujours par un
  // préfixe interne à une seule barre, donc reste sur ce site.
  const url = new URL(next, BASE);
  const allowed = ALLOWED_PREFIXES.some((prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`));
  return allowed ? `${url.pathname}${url.search}${url.hash}` : null;
}

/** URL de la connexion qui ramène à `path` une fois connecté (chemin non sûr ignoré). */
export function loginUrl(path?: string | null): string {
  const next = safeNext(path);
  return next ? `/connexion?next=${encodeURIComponent(next)}` : "/connexion";
}
