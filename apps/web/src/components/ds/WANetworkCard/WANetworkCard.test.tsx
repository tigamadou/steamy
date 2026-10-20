import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

import { networkInitials, WANetworkCardGroup } from "./WANetworkCard";

const NETWORKS = [
  { code: "mtn", label: "MTN" },
  { code: "moov", label: "Moov Money" },
];

describe("networkInitials", () => {
  it.each([
    ["MTN", "MT"],
    ["Moov Money", "MO"],
    ["é-pay", "ÉP"],
  ])("« %s » → « %s »", (label, initials) => {
    expect(networkInitials(label)).toBe(initials);
  });
});

describe("WANetworkCardGroup", () => {
  it("présente les réseaux reçus en radios et signale le choix", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container, rerender } = render(<WANetworkCardGroup networks={NETWORKS} onChange={onChange} />);
    expect(screen.getByRole("group", { name: /Réseau Mobile Money/ })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    await user.click(screen.getByText("Moov Money"));
    expect(onChange).toHaveBeenCalledWith("moov");
    rerender(<WANetworkCardGroup networks={NETWORKS} value="moov" onChange={onChange} error="Choisissez un réseau." />);
    expect(screen.getByRole("radio", { name: "Moov Money" })).toBeChecked();
    expect(screen.getByText("Choisissez un réseau.")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
