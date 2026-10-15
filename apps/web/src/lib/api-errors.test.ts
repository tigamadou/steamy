import { describe, expect, it } from "vitest";

import { fieldMessages, retryAfterSeconds, throttledMessage } from "./api-errors";

describe("erreurs de l'API pour un formulaire", () => {
  it("garde le premier message de chaque champ", () => {
    expect(
      fieldMessages({
        fields: {
          email: [
            { code: "INVALID", message: "Email invalide." },
            { code: "OTHER", message: "Autre." },
          ],
          phone: [],
        },
      }),
    ).toEqual({ email: "Email invalide." });
    expect(fieldMessages(undefined)).toEqual({});
  });

  it("lit Retry-After", () => {
    expect(retryAfterSeconds(new Response(null, { headers: { "Retry-After": "42" } }))).toBe(42);
    expect(retryAfterSeconds(new Response(null))).toBeUndefined();
  });

  it("annonce le délai d'attente au vouvoiement", () => {
    expect(throttledMessage()).toBe("Trop de demandes envoyées. Réessayez dans quelques instants.");
    expect(throttledMessage(1)).toBe("Trop de demandes envoyées. Réessayez dans 1 seconde.");
    expect(throttledMessage(30)).toBe("Trop de demandes envoyées. Réessayez dans 30 secondes.");
    expect(throttledMessage(600)).toBe("Trop de demandes envoyées. Réessayez dans 10 minutes.");
  });
});
