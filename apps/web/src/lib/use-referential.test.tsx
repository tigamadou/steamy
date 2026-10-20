import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const GET = vi.fn();
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ GET }) }));

const { resetReferentials, useReferential } = await import("./use-referential");

const ok = (data: unknown[]) => ({ data, response: new Response(null, { status: 200 }) });
const ko = () => ({ response: new Response(null, { status: 503 }) });

describe("useReferential", () => {
  beforeEach(() => {
    GET.mockReset();
    resetReferentials();
  });

  it("charge un référentiel puis le sert depuis le cache", async () => {
    GET.mockResolvedValue(ok([{ id: 1, code: "mere", label: "Mère" }]));
    const { result } = renderHook(() => useReferential("relationships"));
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.items).toEqual([{ id: 1, code: "mere", label: "Mère" }]);
    expect(GET).toHaveBeenCalledWith("/api/referentials/relationships/", { params: {} });

    const second = renderHook(() => useReferential("relationships"));
    await waitFor(() => expect(second.result.current.status).toBe("ready"));
    expect(GET).toHaveBeenCalledTimes(1);
  });

  it("attend un pays pour les localités puis filtre par pays", async () => {
    GET.mockResolvedValue(ok([{ id: 4, city: "Cotonou" }]));
    const { result, rerender } = renderHook(({ country }) => useReferential("localities", { country }), {
      initialProps: { country: undefined as string | undefined },
    });
    expect(result.current.status).toBe("idle");
    expect(GET).not.toHaveBeenCalled();
    rerender({ country: "BJ" });
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(GET).toHaveBeenCalledWith("/api/referentials/localities/", { params: { query: { country: "BJ" } } });
  });

  it("attend aussi un pays pour les réseaux Mobile Money (D76)", async () => {
    GET.mockResolvedValue(ok([{ id: 1, code: "mtn", label: "MTN", country: "BJ" }]));
    const { result, rerender } = renderHook(({ country }) => useReferential("payment-networks", { country }), {
      initialProps: { country: undefined as string | undefined },
    });
    expect(result.current.status).toBe("idle");
    rerender({ country: "BJ" });
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(GET).toHaveBeenCalledWith("/api/referentials/payment-networks/", { params: { query: { country: "BJ" } } });
  });

  it("signale l'échec puis réessaie à la demande", async () => {
    GET.mockResolvedValueOnce(ko()).mockResolvedValueOnce(ok([{ id: 2, code: "cm2", label: "CM2" }]));
    const { result } = renderHook(() => useReferential("school-grades"));
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.items).toBeUndefined();
    act(() => result.current.retry());
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(GET).toHaveBeenCalledTimes(2);
  });

  it("ignore une réponse arrivée après le démontage", async () => {
    let resolve: (value: unknown) => void = () => {};
    GET.mockReturnValue(new Promise((r) => (resolve = r)));
    const { result, unmount } = renderHook(() => useReferential("goals"));
    unmount();
    resolve(ok([]));
    await Promise.resolve();
    expect(result.current.status).toBe("loading");
  });

  it("ignore un échec arrivé après le démontage", async () => {
    let resolve: (value: unknown) => void = () => {};
    GET.mockReturnValue(new Promise((r) => (resolve = r)));
    const { unmount } = renderHook(() => useReferential("avatars"));
    unmount();
    resolve(ko());
    await new Promise((r) => setTimeout(r, 0));
    expect(GET).toHaveBeenCalledTimes(1);
  });
});
