import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

vi.mock("@/components/auth/SignedInRedirect", () => ({ SignedInRedirect: () => <p>redirection</p> }));

const { default: SignupWelcomePage, metadata } = await import("./page");

describe("SignupWelcomePage (W02)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    window.matchMedia = vi.fn((query: string) => ({ matches: true, media: query }) as MediaQueryList);
  });

  it("présente Steamy, les arguments et les chemins d'inscription", () => {
    render(<SignupWelcomePage />);
    expect(metadata.title).toBe("Inscription");
    expect(screen.getByText("redirection")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Apprends à construire les robots de demain.",
    );
    expect(screen.getByText("1 000+ apprenants déjà inscrits")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toContain(
      "🤖Parcours guidésRobotique, IA, code",
    );
    expect(screen.getByRole("link", { name: /Créer un compte gratuit/ })).toHaveAttribute("href", "/inscription/type");
    expect(screen.getByRole("link", { name: "Reprendre mon inscription" })).toHaveAttribute(
      "href",
      "/inscription/reprendre",
    );
  });

  it("omet le chiffre d'apprenants absent du contenu éditorial", async () => {
    vi.resetModules();
    vi.doMock("@/content/site", () => ({ stats: [] }));
    const { default: Page } = await import("./page");
    render(<Page />);
    expect(screen.queryByText(/déjà inscrits/)).toBeNull();
    vi.doUnmock("@/content/site");
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(<SignupWelcomePage />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
