import type { Schemas } from "@steamy/api-client";

// Erreurs de l'API (D4, SPEC-TECHNIQUE §7.1) vues par un formulaire : `{ code, message, fields }`.

/** Premier message de chaque champ en erreur (`fields` de l'API, clés en camelCase). */
export function fieldMessages(error?: Partial<Schemas["Error"]>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(error?.fields ?? {})
      .filter(([, messages]) => messages.length > 0)
      .map(([field, messages]) => [field, messages[0].message]),
  );
}

/** Délai d'attente annoncé par l'API après `THROTTLED` (`Retry-After`, en secondes). */
export function retryAfterSeconds(response: Response): number | undefined {
  return Number(response.headers.get("Retry-After")) || undefined;
}

/** « Trop de demandes » au vouvoiement, avec le délai quand l'API le donne (en minutes au-delà d'une minute). */
export function throttledMessage(retryAfter?: number): string {
  if (!retryAfter) {
    return "Trop de demandes envoyées. Réessayez dans quelques instants.";
  }
  const delay =
    retryAfter > 90 ? `${Math.ceil(retryAfter / 60)} minutes` : `${retryAfter} seconde${retryAfter > 1 ? "s" : ""}`;
  return `Trop de demandes envoyées. Réessayez dans ${delay}.`;
}
