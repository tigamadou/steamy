import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const GET = vi.fn();
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ GET }) }));

const { useDeliveryZones, zoneOption } = await import("./use-delivery-zones");

const ZONE = { id: 1, country: "BJ", name: "Cotonou et Abomey-Calavi", fee: 1000, delayLabel: "24 à 48 h" };

describe("useDeliveryZones (D38)", () => {
  beforeEach(() => GET.mockReset());

  it("zones du pays, libellées par leur nom et leur délai, valeur = id", async () => {
    GET.mockResolvedValue({ data: [ZONE] });
    const { result } = renderHook(() => useDeliveryZones("BJ"));
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(GET).toHaveBeenCalledWith("/api/shop/delivery-zones/", { params: { query: { country: "BJ" } } });
    expect(result.current.items).toEqual([{ id: 1, code: "1", label: "Cotonou et Abomey-Calavi (24 à 48 h)" }]);
    expect(zoneOption(ZONE).code).toBe("1");
  });

  it("sans pays : liste vide, aucun appel", () => {
    const { result } = renderHook(() => useDeliveryZones(""));
    expect(result.current).toMatchObject({ items: [], status: "ready" });
    expect(GET).not.toHaveBeenCalled();
  });

  it("erreur puis « Réessayer »", async () => {
    GET.mockResolvedValueOnce({ data: undefined }).mockResolvedValueOnce({ data: [ZONE] });
    const { result } = renderHook(() => useDeliveryZones("BJ"));
    await waitFor(() => expect(result.current.status).toBe("error"));
    act(() => result.current.onRetry?.());
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(GET).toHaveBeenCalledTimes(2);
  });

  it("réponse d'un pays abandonné ignorée", async () => {
    let resolve: (value: unknown) => void = () => {};
    GET.mockReturnValueOnce(new Promise((r) => (resolve = r))).mockResolvedValueOnce({ data: [] });
    const { result, rerender } = renderHook(({ country }) => useDeliveryZones(country), {
      initialProps: { country: "BJ" },
    });
    rerender({ country: "TG" });
    await waitFor(() => expect(result.current).toMatchObject({ items: [], status: "ready" }));
    await act(async () => resolve({ data: [ZONE] }));
    expect(result.current.items).toEqual([]);
  });

  it("échec d'un pays abandonné ignoré", async () => {
    let reject: (reason: unknown) => void = () => {};
    GET.mockReturnValueOnce(new Promise((_, r) => (reject = r))).mockResolvedValueOnce({ data: [] });
    const { result, rerender } = renderHook(({ country }) => useDeliveryZones(country), {
      initialProps: { country: "BJ" },
    });
    rerender({ country: "TG" });
    await waitFor(() => expect(result.current.status).toBe("ready"));
    await act(async () => reject(new Error("panne")));
    expect(result.current.status).toBe("ready");
  });
});
