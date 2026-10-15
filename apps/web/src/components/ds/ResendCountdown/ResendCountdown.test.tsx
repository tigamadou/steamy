import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

import { ResendCountdown } from "./ResendCountdown";

const button = () => screen.getByRole("button", { name: "Renvoyer le code" });
const live = (container: HTMLElement) => container.querySelector("[aria-live=polite]");
// Une seconde par `act` : chaque seconde programme la suivante après le rendu
const tick = (seconds: number) => {
  for (let i = 0; i < seconds; i += 1) act(() => vi.advanceTimersByTime(1000));
};

describe("ResendCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("bloque le renvoi pendant 60 s sans annoncer chaque seconde", () => {
    const { container } = render(<ResendCountdown onResend={vi.fn()} />);
    expect(button()).toBeDisabled();
    const countdown = screen.getByText("1:00").parentElement;
    expect(countdown).toHaveAttribute("aria-hidden", "true");
    expect(countdown).toHaveTextContent("Renvoyer le code dans 1:00");
    tick(18);
    expect(screen.getByText("0:42")).toBeInTheDocument();
    expect(live(container)).toHaveTextContent("");
    tick(42);
    expect(button()).toBeEnabled();
    expect(screen.queryByText(/Renvoyer le code dans/)).not.toBeInTheDocument();
    expect(live(container)).toHaveTextContent("Tu peux renvoyer le code.");
  });

  it("redémarre avec le retryAfter de l'API", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onResend = vi.fn().mockResolvedValue(90);
    render(<ResendCountdown seconds={2} onResend={onResend} />);
    tick(2);
    await user.click(button());
    expect(onResend).toHaveBeenCalledOnce();
    expect(await screen.findByText("1:30")).toBeInTheDocument();
    expect(button()).toBeDisabled();
  });

  it("redémarre avec le délai par défaut sans retryAfter", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ResendCountdown seconds={5} onResend={vi.fn().mockResolvedValue(undefined)} />);
    tick(5);
    await user.click(button());
    expect(await screen.findByText("0:05")).toBeInTheDocument();
  });

  it("montre le chargement puis réactive le bouton si le renvoi échoue", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    let reject: (reason: Error) => void = () => {};
    const onResend = vi.fn(() => new Promise<void>((_, fail) => (reject = fail)));
    const { container } = render(<ResendCountdown seconds={1} onResend={onResend} readyMessage="Vous pouvez renvoyer le code." />);
    tick(1);
    await user.click(button());
    expect(button()).toHaveAttribute("aria-busy", "true");
    expect(live(container)).toHaveTextContent("");
    await act(async () => reject(new Error("réseau")));
    expect(button()).toBeEnabled();
    expect(live(container)).toHaveTextContent("Vous pouvez renvoyer le code.");
  });

  it("redémarre quand restartKey change", () => {
    const onResend = vi.fn();
    const { rerender } = render(<ResendCountdown seconds={3} onResend={onResend} restartKey={1} />);
    tick(3);
    expect(button()).toBeEnabled();
    rerender(<ResendCountdown seconds={3} onResend={onResend} restartKey={2} />);
    expect(button()).toBeDisabled();
    expect(screen.getByText("0:03")).toBeInTheDocument();
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    vi.useRealTimers();
    const { container } = render(<ResendCountdown onResend={vi.fn()} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
