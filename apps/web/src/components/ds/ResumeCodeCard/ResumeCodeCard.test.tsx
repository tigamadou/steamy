import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

import { groupCode, ResumeCodeCard } from "./ResumeCodeCard";

const writeText = vi.fn();
const stubClipboard = () =>
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });

describe("groupCode", () => {
  it("groupe le code par 4 en ignorant espaces et tirets", () => {
    expect(groupCode("ABCDEFGH")).toBe("ABCD EFGH");
    expect(groupCode("AB-CD EF GH")).toBe("ABCD EFGH");
    expect(groupCode("ABCDE")).toBe("ABCD E");
    expect(groupCode("ABCD")).toBe("ABCD");
  });
});

describe("ResumeCodeCard", () => {
  afterEach(() => {
    writeText.mockReset();
  });

  it("affiche le code groupé, épelé pour les lecteurs d'écran, et sa date d'expiration", () => {
    render(<ResumeCodeCard code="ABCDEFGH" expiresOn="22 octobre 2026" className="w-full" />);
    expect(screen.getByRole("region", { name: "Ton code de reprise" })).toHaveClass("w-full");
    expect(screen.getByText("ABCD EFGH")).toHaveAttribute("aria-label", "A B C D E F G H");
    expect(screen.getByText(/jusqu'au 22 octobre 2026/)).toBeInTheDocument();
  });

  it("copie le code dans le presse-papiers", async () => {
    stubClipboard();
    writeText.mockResolvedValue(undefined);
    render(<ResumeCodeCard code="ABCDEFGH" expiresOn="22 octobre 2026" />);
    fireEvent.click(screen.getByRole("button", { name: "Copier le code" }));
    expect(await screen.findByText("Code copié.")).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith("ABCDEFGH");
  });

  it("invite à recopier le code quand la copie est impossible", async () => {
    stubClipboard();
    writeText.mockRejectedValue(new Error("refusé"));
    render(<ResumeCodeCard code="ABCDEFGH" expiresOn="22 octobre 2026" />);
    fireEvent.click(screen.getByRole("button", { name: "Copier le code" }));
    expect(await screen.findByText("Copie impossible : recopie-le à la main.")).toBeInTheDocument();
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(<ResumeCodeCard code="ABCDEFGH" expiresOn="22 octobre 2026" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
