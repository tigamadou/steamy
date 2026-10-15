import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SignupState } from "../signup-steps";

const GET = vi.fn();
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ GET }) }));

const { MAX_BACKOFF_MS, POLL_INTERVAL_MS, useSignupPolling } = await import("./useSignupPolling");

const WAITING: SignupState = {
  step: "waiting",
  firstName: "Awa",
  username: "awa.k",
  expiresAt: "2026-10-22T08:00:00Z",
  consentRequest: null,
};

const ok = (data: Partial<SignupState> = {}) => ({ data: { ...WAITING, ...data }, response: new Response(null, { status: 200 }) });
const ko = () => ({ error: { code: "SERVER_ERROR", message: "" }, response: new Response(null, { status: 500 }) });

let visibility: DocumentVisibilityState = "visible";
const setVisibility = (value: DocumentVisibilityState) => {
  visibility = value;
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
};
const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

describe("useSignupPolling (W07)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    GET.mockReset();
    visibility = "visible";
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibility });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("interroge l'API toutes les 15 s tant que l'inscription attend", async () => {
    GET.mockResolvedValue(ok());
    const { result } = renderHook(() => useSignupPolling(WAITING));
    expect(POLL_INTERVAL_MS).toBe(15_000);
    await advance(POLL_INTERVAL_MS - 1);
    expect(GET).not.toHaveBeenCalled();
    await advance(1);
    expect(GET).toHaveBeenCalledWith("/api/auth/learner-signup/");
    await advance(POLL_INTERVAL_MS);
    expect(GET).toHaveBeenCalledTimes(2);
    expect(result.current.step).toBe("waiting");
  });

  it("s'arrête dès que l'inscription quitte l'attente", async () => {
    GET.mockResolvedValue(ok({ step: "password" }));
    const { result } = renderHook(() => useSignupPolling(WAITING));
    await advance(POLL_INTERVAL_MS);
    expect(result.current.step).toBe("password");
    await advance(POLL_INTERVAL_MS * 10);
    expect(GET).toHaveBeenCalledOnce();
  });

  it("n'interroge pas l'API pour une inscription qui n'attend pas", async () => {
    const { result } = renderHook(() => useSignupPolling({ ...WAITING, step: "refused" }));
    await advance(POLL_INTERVAL_MS * 2);
    expect(GET).not.toHaveBeenCalled();
    expect(result.current.step).toBe("refused");
  });

  it("recule ×2 après des échecs, plafonné à 120 s, puis revient à 15 s après un succès", async () => {
    GET.mockResolvedValue(ko());
    renderHook(() => useSignupPolling(WAITING));
    await advance(POLL_INTERVAL_MS);
    expect(GET).toHaveBeenCalledTimes(1);
    for (const [delay, calls] of [
      [30_000, 2],
      [60_000, 3],
      [120_000, 4],
      [MAX_BACKOFF_MS, 5],
    ]) {
      await advance(delay - 1);
      expect(GET).toHaveBeenCalledTimes(calls - 1);
      await advance(1);
      expect(GET).toHaveBeenCalledTimes(calls);
    }
    GET.mockResolvedValue(ok());
    await advance(MAX_BACKOFF_MS);
    expect(GET).toHaveBeenCalledTimes(6);
    await advance(POLL_INTERVAL_MS);
    expect(GET).toHaveBeenCalledTimes(7);
  });

  it("traite un réseau injoignable comme un échec", async () => {
    GET.mockRejectedValue(new TypeError("Failed to fetch"));
    renderHook(() => useSignupPolling(WAITING));
    await advance(POLL_INTERVAL_MS);
    await advance(POLL_INTERVAL_MS);
    expect(GET).toHaveBeenCalledOnce();
    await advance(POLL_INTERVAL_MS);
    expect(GET).toHaveBeenCalledTimes(2);
  });

  it("se suspend quand l'onglet est caché et relance aussitôt à son retour", async () => {
    GET.mockResolvedValue(ok());
    renderHook(() => useSignupPolling(WAITING));
    await advance(5_000);
    setVisibility("hidden");
    await advance(POLL_INTERVAL_MS * 4);
    expect(GET).not.toHaveBeenCalled();
    setVisibility("visible");
    await advance(0);
    expect(GET).toHaveBeenCalledOnce();
    await advance(POLL_INTERVAL_MS);
    expect(GET).toHaveBeenCalledTimes(2);
  });

  it("ne programme rien quand l'onglet est caché au montage", async () => {
    visibility = "hidden";
    GET.mockResolvedValue(ok());
    renderHook(() => useSignupPolling(WAITING));
    await advance(POLL_INTERVAL_MS * 2);
    expect(GET).not.toHaveBeenCalled();
  });

  it("ne met plus rien à jour après le démontage", async () => {
    let resolve: (value: unknown) => void = () => {};
    GET.mockImplementation(() => new Promise((done) => (resolve = done)));
    const { result, unmount } = renderHook(() => useSignupPolling(WAITING));
    await advance(POLL_INTERVAL_MS);
    expect(GET).toHaveBeenCalledOnce();
    unmount();
    await act(async () => resolve(ok({ step: "password" })));
    await advance(POLL_INTERVAL_MS * 4);
    expect(GET).toHaveBeenCalledOnce();
    expect(result.current.step).toBe("waiting");
    setVisibility("visible");
    expect(GET).toHaveBeenCalledOnce();
  });
});
