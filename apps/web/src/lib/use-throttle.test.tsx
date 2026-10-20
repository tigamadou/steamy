import { act, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { throttledLabel, useThrottle } from "./use-throttle";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useThrottle", () => {
  it("THROTTLED avec délai : compte à rebours jusqu'à 0, puis l'envoi est libéré", async () => {
    const { result } = renderHook(() => useThrottle());
    expect(result.current.wait).toBe(0);
    act(() => result.current.track({ code: "THROTTLED", retryAfter: 2 }));
    expect(result.current.wait).toBe(2);
    await act(() => vi.advanceTimersByTimeAsync(1_000));
    expect(result.current.wait).toBe(1);
    await act(() => vi.advanceTimersByTimeAsync(1_000));
    expect(result.current.wait).toBe(0);
    // Le minuteur s'est arrêté : plus aucun rendu
    await act(() => vi.advanceTimersByTimeAsync(5_000));
    expect(result.current.wait).toBe(0);
  });

  it("autre code, ou THROTTLED sans délai communiqué : rien n'est bloqué", () => {
    const { result } = renderHook(() => useThrottle());
    act(() => result.current.track({ code: "THROTTLED" }));
    act(() => result.current.track({ code: "VALIDATION_ERROR", retryAfter: 30 }));
    expect(result.current.wait).toBe(0);
  });

  it("libellé du bouton : compte à rebours pendant l'attente, libellé normal sinon", () => {
    const { rerender } = render(<button>{throttledLabel(65, "Payer")}</button>);
    expect(screen.getByRole("button")).toHaveTextContent("Réessayer dans 1:05");
    rerender(<button>{throttledLabel(0, "Payer")}</button>);
    expect(screen.getByRole("button")).toHaveTextContent("Payer");
  });
});
