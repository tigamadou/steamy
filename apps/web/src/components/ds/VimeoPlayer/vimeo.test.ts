import { describe, expect, it, vi } from "vitest";

import { createProgressTracker, vimeoSrc } from "./vimeo";

describe("vimeoSrc", () => {
  it("place le hachage juste après l'identifiant, puis dnt=1", () => {
    expect(vimeoSrc("76979871", "abc123")).toBe("https://player.vimeo.com/video/76979871?h=abc123&dnt=1");
    expect(vimeoSrc("76979871")).toBe("https://player.vimeo.com/video/76979871?dnt=1");
  });

  it("refuse un identifiant ou un hachage invalide", () => {
    expect(vimeoSrc("76979871/../x")).toBeNull();
    expect(vimeoSrc("123", "a&b=c")).toBeNull();
  });
});

describe("createProgressTracker", () => {
  it("cumule la lecture réelle, sans les sauts, et envoie toutes les 30 s", () => {
    const report = vi.fn();
    const tracker = createProgressTracker(report);
    for (let t = 0; t <= 40; t += 0.25) tracker.tick(t);
    expect(report).toHaveBeenCalledExactlyOnceWith(30);
    // Saut en avant puis en arrière : non comptés
    tracker.tick(300);
    tracker.tick(10);
    tracker.pause();
    expect(report).toHaveBeenLastCalledWith(10);
    expect(report).toHaveBeenCalledTimes(2);
  });

  it("n'envoie rien sans lecture, ni deux fois le même temps", () => {
    const report = vi.fn();
    const tracker = createProgressTracker(report);
    tracker.pause();
    tracker.tick(5);
    tracker.tick(5.5);
    tracker.flush();
    expect(report).not.toHaveBeenCalled();
    tracker.tick(6.5);
    tracker.flush();
    tracker.flush();
    expect(report).toHaveBeenCalledExactlyOnceWith(1);
    // Après une pause, la reprise ne compte pas l'écart avec la dernière position
    // (reste 0,5 s ; l'écart 6,5 → 9 n'est pas compté, 9 → 9,5 l'est)
    tracker.pause();
    tracker.tick(9);
    tracker.tick(9.5);
    tracker.pause();
    expect(report).toHaveBeenCalledTimes(2);
    expect(report).toHaveBeenLastCalledWith(1);
  });
});
