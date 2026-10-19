import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { formatCountdown, RetryCountdown } from "./RetryCountdown";

describe("RetryCountdown", () => {
  afterEach(() => vi.useRealTimers());

  it("désactivé pendant le délai de l'API, puis lien annoncé à l'expiration", () => {
    vi.useFakeTimers();
    render(<RetryCountdown seconds={2} href="/quiz/4" />);
    expect(screen.getByRole("button", { name: /Réessayer le quiz dans 0:02/ })).toBeDisabled();
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByRole("button", { name: /dans 0:01/ })).toBeDisabled();
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByRole("link", { name: /Réessayer le quiz/ })).toHaveAttribute("href", "/quiz/4");
    expect(screen.getByText("Tu peux réessayer le quiz.")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(3000));
  });

  it("sans délai : lien direct, libellés propres à l'écran", () => {
    render(<RetryCountdown seconds={0} href="/q" label="Repasser" readyMessage="C'est reparti." />);
    expect(screen.getByRole("link", { name: /Repasser/ })).toBeInTheDocument();
    expect(screen.getByText("C'est reparti.")).toBeInTheDocument();
  });

  it("formate minutes et secondes", () => {
    expect(formatCountdown(598)).toBe("9:58");
    expect(formatCountdown(5)).toBe("0:05");
  });
});
