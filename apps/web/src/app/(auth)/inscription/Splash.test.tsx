import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

import { Splash } from "./Splash";

const SEEN_KEY = "steamy:splash-vu";

function mockReducedMotion(matches: boolean) {
  window.matchMedia = vi.fn((query: string) => ({ matches, media: query }) as MediaQueryList);
}

describe("Splash (W01)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    mockReducedMotion(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("s'affiche à la première visite de l'onglet puis disparaît après 1,2 s", async () => {
    render(<Splash />);
    expect(screen.queryByTestId("splash")).toBeNull();
    act(() => vi.advanceTimersByTime(0));
    const splash = screen.getByTestId("splash");
    expect(splash).toHaveAttribute("aria-hidden");
    expect(screen.getByText("Apprends · Construis · Joue")).toBeInTheDocument();
    expect(sessionStorage.getItem(SEEN_KEY)).toBe("1");
    act(() => vi.advanceTimersByTime(1199));
    expect(screen.getByTestId("splash")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByTestId("splash")).toBeNull();
  });

  it("ne s'affiche qu'une fois par session d'onglet", () => {
    sessionStorage.setItem(SEEN_KEY, "1");
    render(<Splash />);
    act(() => vi.advanceTimersByTime(0));
    expect(screen.queryByTestId("splash")).toBeNull();
    expect(window.matchMedia).not.toHaveBeenCalled();
  });

  it("est absent sous prefers-reduced-motion", () => {
    mockReducedMotion(true);
    render(<Splash />);
    act(() => vi.advanceTimersByTime(0));
    expect(screen.queryByTestId("splash")).toBeNull();
    expect(window.matchMedia).toHaveBeenCalledWith("(prefers-reduced-motion: reduce)");
  });

  it("est absent si le stockage de session est indisponible", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("stockage bloqué");
    });
    render(<Splash />);
    act(() => vi.advanceTimersByTime(0));
    expect(screen.queryByTestId("splash")).toBeNull();
  });

  it("annule ses minuteries au démontage", () => {
    const { unmount } = render(<Splash />);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(<Splash />);
    act(() => vi.advanceTimersByTime(0));
    vi.useRealTimers();
    expect(await axe(container)).toHaveNoViolations();
  });
});
