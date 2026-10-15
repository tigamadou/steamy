import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const gate = vi.fn();
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ GET: vi.fn() }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/auth/ProfileGate", () => ({
  ProfileGate: ({ children, ...props }: { role: string; steps: string[]; children: (user: object) => ReactNode }) => {
    gate(props);
    return children({ role: "parent", profileStep: "parent-location", firstName: "Koffi" });
  },
}));

const { default: RequestChoicePage, metadata } = await import("./page");

describe("RequestChoicePage (WP04)", () => {
  it("affiche le choix sous la garde du profil parent", async () => {
    const { container } = render(<RequestChoicePage />);
    expect(metadata.title).toBe("Avez-vous reçu une demande ?");
    expect(gate).toHaveBeenCalledWith({ role: "parent", steps: ["parent-location"] });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Avez-vous reçu une demande ?");
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect(await axe(container)).toHaveNoViolations();
  });
});
