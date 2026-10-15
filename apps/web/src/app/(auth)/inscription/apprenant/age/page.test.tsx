import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const router = { push: vi.fn(), replace: vi.fn() };
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ POST: vi.fn() }) }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const { default: LearnerSignupLayout } = await import("../layout");
const { default: AgePage, metadata } = await import("./page");

describe("AgePage (W05)", () => {
  it("affiche l'étape 2/4 et renvoie à W04 sans brouillon", async () => {
    const { container } = render(
      LearnerSignupLayout({ children: <AgePage /> } as LayoutProps<"/inscription/apprenant">),
    );
    expect(metadata.title).toBe("Ton âge");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Quel âge as-tu ?");
    expect(screen.getByText("Inscription · étape 2/4")).toBeInTheDocument();
    expect(router.replace).toHaveBeenCalledWith("/inscription/apprenant/identite");
    expect(await axe(container)).toHaveNoViolations();
  });
});
