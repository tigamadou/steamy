import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

// Faux `Player` de `@vimeo/player` : enregistre l'iframe et les écouteurs, pilotés par le test.
type Handler = (data?: unknown) => void;
const players: FakePlayer[] = [];
let ready: () => Promise<void>;
class FakePlayer {
  handlers: Record<string, Handler> = {};
  destroyed = false;
  constructor(public element: HTMLIFrameElement) {
    players.push(this);
  }
  on(event: string, handler: Handler) {
    this.handlers[event] = handler;
  }
  ready() {
    return ready();
  }
  destroy() {
    this.destroyed = true;
    return Promise.reject(new Error("déjà détruit"));
  }
  emit(event: string, data?: unknown) {
    act(() => this.handlers[event](data));
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

    // Démontage : dernier envoi et lecteur détruit
    for (let t = 7; t <= 8; t += 0.5) player.emit("timeupdate", { seconds: t });
    unmount();
    expect(onProgress).toHaveBeenLastCalledWith(1);
    expect(player.destroyed).toBe(true);
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
