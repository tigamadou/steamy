import { beforeEach, describe, expect, it, vi } from "vitest";

const post = vi.fn();
const getBrowserApi = vi.fn(async () => ({ POST: post }));
vi.mock("./api-browser", () => ({ getBrowserApi }));

const { submitPublicForm } = await import("./public-forms");

const response = (status: number, headers: Record<string, string> = {}) => new Response(null, { status, headers });

describe("submitPublicForm", () => {
  beforeEach(() => {
    post.mockReset();
  });

  it("envoie le corps et confirme un envoi accepté", async () => {
    post.mockResolvedValue({ data: { ok: true }, response: response(201) });
    expect(await submitPublicForm("/api/public/leads/", { email: "a@b.c" })).toEqual({ ok: true });
    expect(post).toHaveBeenCalledWith("/api/public/leads/", { body: { email: "a@b.c" } });
  });

  it("rend les erreurs par champ et le délai d'attente", async () => {
    post.mockResolvedValue({
      error: {
        code: "VALIDATION_ERROR",
        message: "Données invalides.",
        fields: { email: [{ code: "INVALID", message: "Email invalide." }] },
      },
      response: response(400),
    });
    expect(await submitPublicForm("/api/public/leads/", {})).toEqual({
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Données invalides.",
      fields: { email: "Email invalide." },
      retryAfter: undefined,
    });
    post.mockResolvedValue({
      error: { code: "THROTTLED", message: "Trop" },
      response: response(429, { "Retry-After": "60" }),
    });
    expect(await submitPublicForm("/api/public/leads/", {})).toMatchObject({ code: "THROTTLED", retryAfter: 60 });
  });

  it("réponse en erreur sans corps : erreur serveur générique", async () => {
    post.mockResolvedValue({ response: response(502) });
    expect(await submitPublicForm("/api/public/contact-messages/", {})).toMatchObject({
      ok: false,
      code: "SERVER_ERROR",
      fields: {},
    });
  });

  it("coupure réseau : NETWORK_UNAVAILABLE", async () => {
    post.mockRejectedValue(new TypeError("Failed to fetch"));
    expect(await submitPublicForm("/api/public/quote-requests/", {})).toMatchObject({
      ok: false,
      code: "NETWORK_UNAVAILABLE",
    });
  });
});
