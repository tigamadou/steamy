import { apiCall } from "@/lib/api-call";

/** Règle de l'identifiant d'un enfant créé par son parent (WPD04, WPD05 d'origine enseignant), au vouvoiement. */
export const USERNAME_RULE =
  "L'identifiant : 3 à 30 caractères (lettres, chiffres, « . », « _ » ou « - ») avec au moins une lettre, sans « @ ».";
export const USERNAME_TAKEN = "Cet identifiant est déjà associé à un compte Steamy. Choisissez-en un autre.";

/** Disponibilité de l'identifiant : `false` s'il est pris, `null` si l'API ne répond pas (le serveur retranchera). */
export async function isUsernameAvailable(username: string): Promise<boolean | null> {
  const result = await apiCall((api) =>
    api.GET("/api/auth/username-availability/", { params: { query: { username } } }),
  );
  return result.ok ? result.data.available : null;
}

/**
 * Identifiant proposé à partir du prénom et du nom (« Léa Adjovi » → `lea.adjovi`) : sans accents, espaces ni
 * caractères refusés, tronqué à 30 caractères. Le parent peut le changer ; sa disponibilité est vérifiée à part.
 */
export function suggestUsername(firstName: string, lastName: string): string {
  const part = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  return [part(firstName), part(lastName)].filter(Boolean).join(".").slice(0, 30);
}
