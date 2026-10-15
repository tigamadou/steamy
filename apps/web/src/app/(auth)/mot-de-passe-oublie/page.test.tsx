import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ POST: vi.fn() }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock("@/lib/use-referential", () => ({ useReferential: () => ({ items: [], status: "ready" }) }));

const { default: ResetLayout } = await import("./layout");
const { default: ForgotPage, metadata } = await import("./page");
const { useResetFlow } = await import("./ResetFlow");

function Channel() {
  return <p>Canal : {useResetFlow().flow.channel}</p>;
}

describe("Mot de passe oublié · layout et page WL02", () => {
  it("fournit l'état du parcours aux écrans", () => {
    render(ResetLayout({ children: <Channel /> } as LayoutProps<"/mot-de-passe-oublie">));
    expect(screen.getByText("Canal : sms")).toBeInTheDocument();
  });

  it("affiche WL02 sous le layout et reste accessible", async () => {
    expect(metadata.title).toBe("Mot de passe oublié · Steamy");
    const { container } = render(ResetLayout({ children: <ForgotPage /> } as LayoutProps<"/mot-de-passe-oublie">));
    expect(screen.getByRole("heading", { name: "Pas de panique !" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
