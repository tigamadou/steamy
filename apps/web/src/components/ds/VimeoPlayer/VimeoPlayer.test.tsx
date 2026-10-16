import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

// Faux `Player` de `@vimeo/player` : comme le SDK, une instance par iframe (réutilisée au remontage) ; enregistre
// les écouteurs, pilotés par le test. `destroy()` retirerait l'iframe du DOM : il ne doit jamais être appelé.
type Handler = (data?: unknown) => void;
const players: FakePlayer[] = [];
const byElement = new WeakMap<HTMLIFrameElement, FakePlayer>();
let ready: () => Promise<void>;
class FakePlayer {
  handlers: Record<string, Handler> = {};
  destroy = vi.fn();
  constructor(public element: HTMLIFrameElement) {
    const existing = byElement.get(element);
    if (existing) return existing;
    byElement.set(element, this);
    players.push(this);
  }
  on(event: string, handler: Handler) {
    this.handlers[event] = handler;
  }
  off(event: string) {
    delete this.handlers[event];
  }
  ready() {
    return ready();
  }
  emit(event: string, data?: unknown) {
    act(() => this.handlers[event]?.(data));
  }
}
vi.mock("@vimeo/player", () => ({ default: FakePlayer }));

const { VimeoPlayer } = await import("./VimeoPlayer");

beforeEach(() => {
  players.length = 0;
  ready = () => Promise.resolve();
});

async function play(props: Partial<Parameters<typeof VimeoPlayer>[0]> = {}) {
  const user = userEvent.setup();
  const utils = render(<VimeoPlayer vimeoId="76979871" vimeoHash="abc" title="Bande-annonce" {...props} />);
  await user.click(screen.getByRole("button", { name: /Lire la vidéo : Bande-annonce/ }));
  const frame = await screen.findByTitle("Bande-annonce");
  return { ...utils, frame, player: players[0] };
}

describe("VimeoPlayer", () => {
  it("n'insère ni iframe ni lecteur avant le clic sur la vignette", async () => {
    const { container } = render(
      <VimeoPlayer vimeoId="76979871" title="Bande-annonce" poster="🤖" playLabel="Lire la bande-annonce" />,
    );
    expect(container.querySelector("iframe")).toBeNull();
    expect(players).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Lire la bande-annonce : Bande-annonce" })).toHaveTextContent("🤖");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("monte l'iframe Vimeo (hachage, dnt) et branche le lecteur dessus", async () => {
    const { frame, player } = await play();
    expect(frame).toHaveAttribute("src", "https://player.vimeo.com/video/76979871?h=abc&dnt=1");
    expect(frame).toHaveAttribute("allow", "fullscreen; picture-in-picture");
    expect(player.element).toBe(frame);
  });

  it("remonte les secondes lues à la pause, à la fin et en arrière-plan", async () => {
    const onProgress = vi.fn();
    const { player, unmount } = await play({ onProgress });
    for (let t = 0; t <= 3; t += 0.5) player.emit("timeupdate", { seconds: t });
    player.emit("pause");
    expect(onProgress).toHaveBeenLastCalledWith(3);
    for (let t = 3; t <= 5; t += 0.5) player.emit("timeupdate", { seconds: t });
    player.emit("ended");
    expect(onProgress).toHaveBeenLastCalledWith(2);

    for (let t = 5; t <= 7; t += 0.5) player.emit("timeupdate", { seconds: t });
    const visibility = vi.spyOn(document, "visibilityState", "get");
    visibility.mockReturnValue("visible");
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(onProgress).toHaveBeenCalledTimes(2);
    visibility.mockReturnValue("hidden");
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(onProgress).toHaveBeenLastCalledWith(2);
    visibility.mockRestore();

    // Démontage : dernier envoi, écouteurs retirés, iframe laissée à React
    for (let t = 7; t <= 8; t += 0.5) player.emit("timeupdate", { seconds: t });
    unmount();
    expect(onProgress).toHaveBeenLastCalledWith(1);
    expect(player.handlers).toEqual({});
    expect(player.destroy).not.toHaveBeenCalled();
  });

  it("StrictMode : démonté puis remonté, le lecteur garde son iframe et ses écouteurs", async () => {
    const user = userEvent.setup();
    const onProgress = vi.fn();
    render(
      <StrictMode>
        <VimeoPlayer vimeoId="76979871" title="Mission" onProgress={onProgress} />
      </StrictMode>,
    );
    await user.click(screen.getByRole("button"));
    const frame = await screen.findByTitle("Mission");
    expect(frame.isConnected).toBe(true);
    expect(players).toHaveLength(1);
    const [player] = players;
    expect(player.element).toBe(frame);
    for (let t = 0; t <= 2; t += 0.5) player.emit("timeupdate", { seconds: t });
    player.emit("pause");
    expect(onProgress).toHaveBeenLastCalledWith(2);
    expect(player.destroy).not.toHaveBeenCalled();
  });

  it("changement de vidéo : nouvelle iframe, nouveau lecteur, l'ancien n'écoute plus", async () => {
    const onProgress = vi.fn();
    const { player, rerender } = await play({ onProgress });
    rerender(<VimeoPlayer vimeoId="12345" title="Bande-annonce" onProgress={onProgress} />);
    const frame = await screen.findByTitle("Bande-annonce");
    expect(frame).toHaveAttribute("src", "https://player.vimeo.com/video/12345?dnt=1");
    expect(players).toHaveLength(2);
    expect(players[1].element).toBe(frame);
    expect(player.handlers).toEqual({});
    // L'ancien lecteur ne réagit plus : son erreur éventuelle n'affiche pas le repli
    player.emit("error");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("une erreur arrivée après le démontage est ignorée", async () => {
    let reject!: (error: Error) => void;
    ready = () => new Promise((_, fail) => (reject = fail));
    const { unmount } = await play();
    unmount();
    await act(async () => reject(new Error("trop tard")));
  });

  it("sans onProgress, la lecture ne plante pas", async () => {
    const { player } = await play();
    for (let t = 0; t <= 2; t += 0.5) player.emit("timeupdate", { seconds: t });
    player.emit("pause");
  });

  it("vidéo refusée par Vimeo → « La vidéo ne peut pas être lue »", async () => {
    const { player } = await play();
    player.emit("error", { name: "PrivacyError" });
    expect(screen.getByRole("alert")).toHaveTextContent("La vidéo ne peut pas être lue.");
    expect(screen.queryByTitle("Bande-annonce")).not.toBeInTheDocument();
  });

  it("lecteur qui ne s'initialise pas → repli", async () => {
    ready = () => Promise.reject(new Error("domaine refusé"));
    const user = userEvent.setup();
    render(<VimeoPlayer vimeoId="76979871" title="Mission" />);
    await user.click(screen.getByRole("button"));
    expect(await screen.findByRole("alert")).toHaveTextContent("La vidéo ne peut pas être lue.");
  });

  it("identifiant invalide : repli d'emblée, sans vignette", () => {
    render(<VimeoPlayer vimeoId="pas-un-id" title="Mission" />);
    expect(screen.getByRole("alert")).toHaveTextContent("La vidéo ne peut pas être lue.");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
