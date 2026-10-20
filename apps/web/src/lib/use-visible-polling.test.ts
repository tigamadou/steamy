import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useVisiblePolling } from "./use-visible-polling";

let visibility: DocumentVisibilityState = "visible";

function setVisibility(state: DocumentVisibilityState) {
  visibility = state;
  document.dispatchEvent(new Event("visibilitychange"));
}

beforeEach(() => {
  vi.useFakeTimers();
  visibility = "visible";
  vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibility);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useVisiblePolling", () => {
  it("interroge à intervalle régulier tant que l'onglet est visible", () => {
    const poll = vi.fn();
    const { unmount } = renderHook(() => useVisiblePolling(poll, 10_000, true));
    vi.advanceTimersByTime(25_000);
    expect(poll).toHaveBeenCalledTimes(2);
    unmount();
    vi.advanceTimersByTime(20_000);
    expect(poll).toHaveBeenCalledTimes(2);
  });

  it("s'arrête quand l'onglet est masqué et relit aussitôt à son retour", () => {
    const poll = vi.fn();
    renderHook(() => useVisiblePolling(poll, 10_000, true));
    setVisibility("hidden");
    vi.advanceTimersByTime(30_000);
    expect(poll).not.toHaveBeenCalled();
    setVisibility("visible");
    expect(poll).toHaveBeenCalledTimes(1);
    // Un second retour au premier plan ne double pas le minuteur
    setVisibility("visible");
    vi.advanceTimersByTime(10_000);
    expect(poll).toHaveBeenCalledTimes(3);
  });

  it("ne démarre pas dans un onglet masqué, ni désactivé", () => {
    const poll = vi.fn();
    visibility = "hidden";
    renderHook(() => useVisiblePolling(poll, 1_000, true));
    vi.advanceTimersByTime(5_000);
    visibility = "visible";
    const other = vi.fn();
    renderHook(() => useVisiblePolling(other, 1_000, false));
    vi.advanceTimersByTime(5_000);
    expect(poll).not.toHaveBeenCalled();
    expect(other).not.toHaveBeenCalled();
  });

  it("appelle toujours la fonction la plus récente", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ poll }) => useVisiblePolling(poll, 1_000, true), {
      initialProps: { poll: first },
    });
    rerender({ poll: second });
    vi.advanceTimersByTime(1_000);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
