import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

import { NotifItem } from "./NotifItem";

const BASE = {
  icon: "🏆",
  tone: "success",
  title: "Nouveau badge débloqué",
  message: "Premier robot construit, bravo !",
  time: "il y a 1 h",
  dateTime: "2026-10-16T10:00:00Z",
} as const;

describe("NotifItem", () => {
  it("annonce une notification non lue et s'active au clic", async () => {
    const onSelect = vi.fn();
    const { container } = render(<NotifItem {...BASE} unread onSelect={onSelect} />);
    const button = screen.getByRole("button", { name: /^Non lue :\s*Nouveau badge débloqué/ });
    expect(button).toHaveClass("bg-primary-50");
    expect(screen.getByText("il y a 1 h")).toHaveAttribute("datetime", BASE.dateTime);
    await userEvent.click(button);
    expect(onSelect).toHaveBeenCalled();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("désactive le bouton pendant la lecture", () => {
    render(<NotifItem {...BASE} onSelect={() => {}} busy />);
    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true");
  });

  it("sans action ni message, une simple carte lue, teintée selon le ton", () => {
    const { container } = render(<NotifItem {...BASE} message={undefined} tone="danger" />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByText(/Non lue/)).toBeNull();
    expect(container.querySelector(".bg-error-100")).not.toBeNull();
  });
});
