import { beforeEach, describe, expect, it, vi } from "vitest";

const GET = vi.fn();
const getCurrentUser = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`redirect:${url}`);
});
const notFound = vi.fn(() => {
  throw new Error("notFound");
});
vi.mock("@/lib/api", () => ({ getServerApi: async () => ({ GET }) }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser }));
vi.mock("next/navigation", () => ({ redirect, notFound }));

const { RequestGate, requestPath } = await import("./RequestGate");

const respond = (status: number, data?: object) => ({ data, response: new Response(null, { status }) });
const params = Promise.resolve({ id: "7" });
const children = vi.fn(() => "écran");
const PARENT = { role: "parent", profileStep: null, firstName: "Koffi" };

describe("requestPath", () => {
  it.each([
    ["pending", "/inscription/parent/demande/7"],
    ["accepted", "/inscription/parent/demande/7/acceptee"],
    ["refused", "/inscription/parent/demande/7/refusee"],
    ["expired", "/inscription/parent/demande/7"],
  ])("mène une demande %s à son écran", (status, path) => {
    expect(requestPath(7, status)).toBe(path);
  });
});

describe("RequestGate", () => {
  beforeEach(() => {
    GET.mockReset();
    getCurrentUser.mockReset();
    children.mockClear();
  });

  it("rend l'écran avec la demande et le parent connecté", async () => {
    const request = { id: 7, status: "pending" };
    getCurrentUser.mockResolvedValue(PARENT);
    GET.mockResolvedValue(respond(200, request));
    await expect(RequestGate({ params, children })).resolves.toBe("écran");
    expect(GET).toHaveBeenCalledWith("/api/accounts/consent-requests/{id}/", { params: { path: { id: "7" } } });
    expect(children).toHaveBeenCalledWith(request, PARENT);
  });

  it("renvoie vers la connexion avec retour ici sans session", async () => {
    getCurrentUser.mockResolvedValue(null);
    await expect(RequestGate({ params, children })).rejects.toThrow(
      "redirect:/connexion?next=%2Finscription%2Fparent%2Fdemande%2F7",
    );
    expect(GET).not.toHaveBeenCalled();
  });

  it("renvoie un autre rôle vers son espace", async () => {
    getCurrentUser.mockResolvedValue({ role: "learner", profileStep: null });
    await expect(RequestGate({ params, children })).rejects.toThrow("redirect:/apprenant");
    expect(GET).not.toHaveBeenCalled();
  });

  it("répond 404 pour une demande introuvable, sans rendre l'écran", async () => {
    getCurrentUser.mockResolvedValue(PARENT);
    GET.mockResolvedValue(respond(404));
    await expect(RequestGate({ params, children })).rejects.toThrow("notFound");
    expect(children).not.toHaveBeenCalled();
  });
});
