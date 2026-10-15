import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UNDO_TOAST_MS, useUndoableAction, type ActionOutcome } from "./use-undoable-action";

type Server = { commit: () => Promise<ActionOutcome>; undo: () => Promise<ActionOutcome> };

/** Liste à un élément retiré de façon réversible. */
function Harness({ server }: { server: Server }) {
  const [shown, setShown] = useState(true);
  const { perform, notify, toast } = useUndoableAction();
  return (
    <>
      <p>{shown ? "Robotique" : "—"}</p>
      <button
        type="button"
        onClick={() =>
          perform({
            message: "Parcours retiré des souhaits",
            apply: () => setShown(false),
            revert: () => setShown(true),
            ...server,
          })
        }
      >
        Retirer
      </button>
      <button type="button" onClick={() => notify("Ajouté")}>
        Informer
      </button>
      {toast}
    </>
  );
}

const ok = async () => null;

afterEach(() => {
  vi.useRealTimers();
});

describe("useUndoableAction (WW03)", () => {
  it("applique tout de suite, annonce, puis rétablit à « Annuler »", async () => {
    const user = userEvent.setup();
    const server = { commit: vi.fn(ok), undo: vi.fn(ok) };
    render(<Harness server={server} />);
    await user.click(screen.getByRole("button", { name: "Retirer" }));
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Parcours retiré des souhaits");
    expect(server.commit).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.getByText("Robotique")).toBeInTheDocument();
    expect(server.undo).toHaveBeenCalledOnce();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("un envoi en échec rétablit l'élément et affiche l'erreur ; « Annuler » ne renvoie rien", async () => {
    const user = userEvent.setup();
    let fail!: (message: string) => void;
    const server = {
      commit: vi.fn(() => new Promise<ActionOutcome>((resolve) => (fail = resolve))),
      undo: vi.fn(ok),
    };
    render(<Harness server={server} />);
    await user.click(screen.getByRole("button", { name: "Retirer" }));
    // « Annuler » pendant l'envoi : attend son issue
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    await act(async () => fail("Le serveur est injoignable."));
    expect(screen.getByText("Robotique")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Le serveur est injoignable.");
    expect(server.undo).not.toHaveBeenCalled();
  });

  it("une annulation en échec remet l'action et l'annonce", async () => {
    const user = userEvent.setup();
    render(<Harness server={{ commit: ok, undo: async () => "Annulation impossible." }} />);
    await user.click(screen.getByRole("button", { name: "Retirer" }));
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Annulation impossible.");
    // L'erreur reste jusqu'à sa fermeture
    await user.click(screen.getByRole("button", { name: "Fermer" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("le toast d'information disparaît seul ; un toast plus récent n'est pas fermé par l'ancien délai", () => {
    vi.useFakeTimers();
    render(<Harness server={{ commit: ok, undo: ok }} />);
    act(() => screen.getByRole("button", { name: "Informer" }).click());
    act(() => vi.advanceTimersByTime(UNDO_TOAST_MS - 1000));
    act(() => screen.getByRole("button", { name: "Informer" }).click());
    act(() => vi.advanceTimersByTime(1500));
    expect(screen.getByRole("status")).toHaveTextContent("Ajouté");
    act(() => vi.advanceTimersByTime(UNDO_TOAST_MS));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
