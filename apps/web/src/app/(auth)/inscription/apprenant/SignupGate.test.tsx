import { beforeEach, describe, expect, it, vi } from "vitest";

const GET = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`redirect:${url}`);
});
vi.mock("@/lib/api", () => ({ getServerApi: async () => ({ GET }) }));
vi.mock("next/navigation", () => ({ redirect }));

const { STEP_PATH, SignupGate } = await import("./SignupGate");

const respond = (status: number, data?: object) => ({ data, response: new Response(null, { status }) });
const children = vi.fn(() => "écran");

describe("SignupGate", () => {
  beforeEach(() => {
    GET.mockReset();
    children.mockClear();
  });

  it("rend l'écran de l'étape en cours avec l'état de l'inscription", async () => {
    const state = { step: "parent" };
    GET.mockResolvedValue(respond(200, state));
    await expect(SignupGate({ steps: ["parent"], children })).resolves.toBe("écran");
    expect(GET).toHaveBeenCalledWith("/api/auth/learner-signup/");
    expect(children).toHaveBeenCalledWith(state);
  });

  it("renvoie vers l'écran de l'étape réelle", async () => {
    GET.mockResolvedValue(respond(200, { step: "waiting" }));
    await expect(SignupGate({ steps: ["parent"], children })).rejects.toThrow(`redirect:${STEP_PATH.waiting}`);
    expect(children).not.toHaveBeenCalled();
  });

  it("renvoie vers la reprise par code sans inscription en cours", async () => {
    GET.mockResolvedValue(respond(404));
    await expect(SignupGate({ steps: ["parent"], children })).rejects.toThrow("redirect:/inscription/reprendre");
  });

  it("lève une erreur quand l'API est en panne", async () => {
    GET.mockResolvedValue(respond(503));
    await expect(SignupGate({ steps: ["parent"], children })).rejects.toThrow("Inscription illisible (503)");
    expect(redirect).not.toHaveBeenCalledWith("/inscription/reprendre");
  });
});
