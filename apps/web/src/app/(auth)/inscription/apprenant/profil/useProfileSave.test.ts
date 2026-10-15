import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const PATCH = vi.fn();
const router = { replace: vi.fn() };
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ PATCH }) }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const { useLearnerProfileSave } = await import("./useProfileSave");

const respond = (status: number, body: object = {}) => ({ ...body, response: new Response(null, { status }) });

describe("useLearnerProfileSave", () => {
  beforeEach(() => {
    PATCH.mockReset();
    router.replace.mockReset();
  });

  it("enregistre l'étape puis ouvre l'étape suivante donnée par l'API", async () => {
    PATCH.mockResolvedValue(respond(200, { data: { profileStep: "learner-school" } }));
    const { result } = renderHook(() => useLearnerProfileSave());
    await expect(result.current({ goals: ["code"] })).resolves.toBeNull();
    expect(PATCH).toHaveBeenCalledWith("/api/accounts/me/learner-profile/", { body: { goals: ["code"] } });
    expect(router.replace).toHaveBeenCalledWith("/inscription/apprenant/profil/ecole");
  });

  it("ouvre la bienvenue (W15) quand le profil est complet", async () => {
    PATCH.mockResolvedValue(respond(200, { data: { profileStep: null } }));
    const { result } = renderHook(() => useLearnerProfileSave());
    await expect(result.current({ avatar: "chat" })).resolves.toBeNull();
    expect(router.replace).toHaveBeenCalledWith("/inscription/apprenant/bienvenue");
  });

  it("renvoie l'échec sans changer d'écran", async () => {
    PATCH.mockResolvedValue(respond(400, { error: { code: "VALIDATION_ERROR", message: "Invalide." } }));
    const { result } = renderHook(() => useLearnerProfileSave());
    await expect(result.current({})).resolves.toMatchObject({ ok: false, code: "VALIDATION_ERROR", message: "Invalide." });
    expect(router.replace).not.toHaveBeenCalled();
  });
});
