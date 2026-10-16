import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

import { Toggle } from "./Toggle";

describe("Toggle", () => {
  it("est un interrupteur dont l'état est annoncé et basculé au clavier", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(<Toggle checked={false} onChange={onChange} aria-label="Emails" />);
    const toggle = screen.getByRole("switch", { name: "Emails" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    toggle.focus();
    await user.keyboard(" ");
    expect(onChange).toHaveBeenCalledWith(true);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("allumé, il propose de s'éteindre ; désactivé, il ne réagit pas", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(<Toggle checked onChange={onChange} aria-label="Emails" />);
    await user.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledWith(false);
    onChange.mockClear();
    rerender(<Toggle checked onChange={onChange} aria-label="Emails" disabled />);
    await user.click(screen.getByRole("switch"));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("switch")).toBeDisabled();
  });
});
