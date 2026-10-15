import { act, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
let pathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ refresh }),
}));

const { OfflineGate } = await import("./OfflineGate");

function setNetwork(online: boolean) {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(online);
}

function goOffline() {
  setNetwork(false);
  act(() => {
    window.dispatchEvent(new Event("offline"));
  });
}

function goOnline() {
  setNetwork(true);
  act(() => {
    window.dispatchEvent(new Event("online"));
  });
}

describe("OfflineGate (WX01)", () => {
  beforeEach(() => {
    pathname = "/";
    refresh.mockReset();
    setNetwork(true);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ne rend rien côté serveur", () => {
    expect(renderToString(<OfflineGate />)).toBe("");
  });

  it("n'affiche rien tant que le navigateur est en ligne", () => {
    const { container } = render(<OfflineGate />);
    expect(container).toBeEmptyDOMElement();
  });

  it("recouvre la page hors ligne, prend le focus, puis recharge les données au retour du réseau", () => {
    render(<OfflineGate />);
    goOffline();

    const dialog = screen.getByRole("alertdialog", { name: "Tu es hors ligne" });
    expect(dialog).toHaveFocus();
    expect(refresh).not.toHaveBeenCalled();

    goOnline();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("annonce un essai infructueux tant que le réseau manque", async () => {
    render(<OfflineGate />);
    goOffline();
    await userEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(screen.getByText(/Toujours pas de réseau/)).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("recharge sur « Réessayer » si le réseau est revenu sans événement", async () => {
    render(<OfflineGate />);
    goOffline();
    setNetwork(true);
    await userEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("vouvoie dans l'espace parent", () => {
    pathname = "/parent/enfants/1";
    setNetwork(false);
    render(<OfflineGate />);
    expect(screen.getByRole("alertdialog", { name: "Vous êtes hors ligne" })).toBeInTheDocument();
  });

  it("se désabonne des événements réseau au démontage", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<OfflineGate />);
    unmount();
    expect(remove).toHaveBeenCalledWith("online", expect.any(Function));
    expect(remove).toHaveBeenCalledWith("offline", expect.any(Function));
  });
});
