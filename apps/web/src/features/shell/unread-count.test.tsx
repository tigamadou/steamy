import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiCall = vi.fn();
let pathname = "/apprenant";
vi.mock("@/lib/api-call", () => ({ apiCall: (request: unknown) => apiCall(request) }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

const { notifyNotificationsChanged, UNREAD_REFRESH_MS, useUnreadCount } = await import("./unread-count");

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
}

describe("useUnreadCount", () => {
  beforeEach(() => {
    apiCall.mockReset();
    apiCall.mockResolvedValue({ ok: true, data: { count: 4 } });
    pathname = "/apprenant";
    setVisibility("visible");
  });
  afterEach(() => vi.useRealTimers());

  it("part de la valeur du serveur puis relit le compteur", async () => {
    const { result } = renderHook(() => useUnreadCount(2));
    expect(result.current).toBe(2);
    await waitFor(() => expect(result.current).toBe(4));
    const request = apiCall.mock.calls[0][0] as (api: { GET: (path: string) => unknown }) => unknown;
    const GET = vi.fn();
    request({ GET });
    expect(GET).toHaveBeenCalledWith("/api/notifications/unread-count/");
  });

  it("garde la valeur connue si la lecture échoue", async () => {
    apiCall.mockResolvedValue({ ok: false, code: "NETWORK_UNAVAILABLE" });
    const { result } = renderHook(() => useUnreadCount(2));
    await waitFor(() => expect(apiCall).toHaveBeenCalled());
    expect(result.current).toBe(2);
  });

  it("relit à chaque navigation", async () => {
    const { rerender } = renderHook(() => useUnreadCount(0));
    await waitFor(() => expect(apiCall).toHaveBeenCalledTimes(1));
    pathname = "/apprenant/catalogue";
    rerender();
    await waitFor(() => expect(apiCall).toHaveBeenCalledTimes(2));
  });

  it("adopte une nouvelle valeur rendue par le serveur", async () => {
    apiCall.mockReturnValue(new Promise(() => {}));
    const { result, rerender } = renderHook(({ initial }) => useUnreadCount(initial), { initialProps: { initial: 1 } });
    rerender({ initial: 7 });
    expect(result.current).toBe(7);
  });

  it("toutes les 60 s, onglet visible seulement, et au retour sur l'onglet", async () => {
    vi.useFakeTimers();
    renderHook(() => useUnreadCount(0));
    await act(async () => {});
    expect(apiCall).toHaveBeenCalledTimes(1);
    await act(async () => vi.advanceTimersByTime(UNREAD_REFRESH_MS));
    expect(apiCall).toHaveBeenCalledTimes(2);
    setVisibility("hidden");
    await act(async () => vi.advanceTimersByTime(UNREAD_REFRESH_MS));
    expect(apiCall).toHaveBeenCalledTimes(2);
    setVisibility("visible");
    await act(async () => document.dispatchEvent(new Event("visibilitychange")));
    expect(apiCall).toHaveBeenCalledTimes(3);
  });

  it("suit les changements signalés par les écrans de notifications", async () => {
    const { result, unmount } = renderHook(() => useUnreadCount(3));
    await waitFor(() => expect(result.current).toBe(4));
    act(() => notifyNotificationsChanged(0));
    expect(result.current).toBe(0);
    apiCall.mockResolvedValue({ ok: true, data: { count: 9 } });
    act(() => notifyNotificationsChanged());
    await waitFor(() => expect(result.current).toBe(9));
    unmount();
    act(() => notifyNotificationsChanged(1));
  });
});
