import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { MissionItem } from "./MissionItem";

describe("MissionItem", () => {
  it("verrouillée : ni lien ni focus, état annoncé", async () => {
    const { container } = render(
      <MissionItem step="Mission 3" title="Capteurs avancés" duration="50 min" state="locked" href="/m/3" />,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(container.querySelector('[aria-disabled="true"]')).not.toBeNull();
    expect(container.querySelector("[tabindex]")).toBeNull();
    expect(screen.getByText("· Verrouillée")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("en cours : lien marqué comme étape courante", () => {
    render(<MissionItem step="Mission 2" title="Servo" duration="1 h" state="current" icon="⚙️" href="/m/2" />);
    const link = screen.getByRole("link", { name: /Servo/ });
    expect(link).toHaveAttribute("href", "/m/2");
    expect(link).toHaveAttribute("aria-current", "step");
    expect(screen.getByText("⚙️")).toBeInTheDocument();
    expect(screen.getByText("· En cours")).toBeInTheDocument();
  });

  it("terminée ou ouverte : lien sans marque courante ; sans cible, simple bloc", () => {
    const { rerender } = render(<MissionItem step="Mission 1" title="Capteur" state="done" href="/m/1" />);
    expect(screen.getByRole("link")).not.toHaveAttribute("aria-current");
    expect(screen.getByText("· Terminée")).toBeInTheDocument();
    rerender(<MissionItem step="Mission 4" title="Bonus" state="available" href="/m/4" />);
    expect(screen.getByText("🤖")).toBeInTheDocument();
    expect(screen.queryByText(/·/)).not.toBeInTheDocument();
    rerender(<MissionItem step="Mission 4" title="Bonus" state="available" />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
