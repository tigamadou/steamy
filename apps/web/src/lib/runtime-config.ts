/** Configuration servie au navigateur par la route /runtime-config. */
export type RuntimeConfig = {
  /** URL publique de l'API, joignable depuis le navigateur. */
  apiUrl: string;
};

/**
 * URL publique de l'API, côté serveur (`PUBLIC_API_URL`, la même que celle servie par `/runtime-config`) : pour les
 * liens que le navigateur ouvre directement sur l'API (admin Django, facture ou certificat PDF redirigés vers une URL
 * signée du stockage).
 */
export function publicApiUrl(): string {
  const url = process.env.PUBLIC_API_URL;
  if (!url) throw new Error("PUBLIC_API_URL n'est pas défini");
  return url.replace(/\/+$/, "");
}
