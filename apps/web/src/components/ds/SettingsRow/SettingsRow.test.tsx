import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

import { SettingsRow } from "./SettingsRow";

describe("SettingsRow", () => {
  it("avec un interrupteur : nommé par le libellé, décrit par la description", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(
      <SettingsRow label="Badges débloqués" description="Quand tu gagnes un badge" checked={false} onChange={onChange} />,
    );
    const toggle = screen.getByRole("switch", { name: "Badges débloqués" });
    expect(toggle).toHaveAccessibleDescription("Quand tu gagnes un badge");
    await user.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("interrupteur sans description, désactivable", () => {
    render(<SettingsRow label="Dans l'application" checked onChange={() => {}} disabled />);
    const toggle = screen.getByRole("switch", { name: "Dans l'application" });
    expect(toggle).toBeDisabled();
    expect(toggle).not.toHaveAttribute("aria-describedby");
  });

  it("en lien de navigation, avec ou sans valeur", () => {
    const { rerender } = render(<SettingsRow label="Mot de passe" href="/apprenant/profil/mot-de-passe" />);
    expect(screen.getByRole("link", { name: /Mot de passe/ })).toHaveAttribute("href", "/apprenant/profil/mot-de-passe");
    rerender(<SettingsRow label="Livraison" description="Adresse" value="Cotonou" href="/l" />);
    expect(screen.getByRole("link", { name: /Livraison.*Cotonou/ })).toBeInTheDocument();
  });

  it("en lecture seule (identifiant non modifiable)", () => {
    render(<SettingsRow label="Identifiant" value="lea.adjovi" />);
    expect(screen.getByText("lea.adjovi")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });
});
