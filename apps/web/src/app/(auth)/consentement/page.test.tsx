import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./ConsentLanding", () => ({ ConsentLanding: () => <p>Atterrissage</p> }));

const { default: ConsentPage, metadata } = await import("./page");

describe("ConsentPage", () => {
  it("rend l'atterrissage du lien SMS", () => {
    render(<ConsentPage />);
    expect(metadata.title).toBe("Demande de consentement");
    expect(screen.getByText("Atterrissage")).toBeInTheDocument();
  });
});
