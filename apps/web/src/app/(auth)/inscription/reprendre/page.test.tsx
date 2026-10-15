import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ POST: vi.fn() }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

const { default: ResumePage, metadata } = await import("./page");

describe("ResumePage", () => {
  it("affiche le formulaire de reprise d'inscription", async () => {
    const { container } = render(<ResumePage />);
    expect(metadata.title).toBe("Reprendre mon inscription");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Reprendre mon inscription");
    expect(screen.getByRole("button", { name: "Reprendre mon inscription" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
