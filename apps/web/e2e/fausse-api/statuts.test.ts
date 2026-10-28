import { describe, expect, it } from "vitest";

import { messageOf, statusOf } from "./statuts.ts";

describe("table des erreurs lue dans apps/api/libs/errors.py", () => {
  it("donne le statut HTTP du code, y compris quand le message est sur la ligne suivante", () => {
    expect(statusOf("OUT_OF_STOCK")).toBe(409);
    expect(statusOf("ORDER_EXPIRED")).toBe(410);
    expect(statusOf("THROTTLED")).toBe(429);
    expect(statusOf("PAYMENT_IN_PROGRESS")).toBe(409);
    expect(statusOf("SERVER_ERROR")).toBe(500);
  });

  it("donne le message de l'API", () => {
    expect(messageOf("NOT_FOUND")).toBe("Élément non trouvé.");
  });

  it("refuse un code que l'API ne connaît pas", () => {
    expect(() => statusOf("CODE_INCONNU" as never)).toThrow(/absent de apps\/api\/libs\/errors.py/);
  });
});
