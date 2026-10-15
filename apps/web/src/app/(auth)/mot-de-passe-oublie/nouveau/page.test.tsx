import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const router = { push: vi.fn(), replace: vi.fn() };
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ POST: vi.fn() }) }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const { default: NewPasswordPage, metadata } = await import("./page");
const { ResetFlowProvider } = await import("../ResetFlow");

describe("Page WL04", () => {
  it("affiche l'écran du nouveau mot de passe sous le parcours (renvoi à WL02 sans jeton)", () => {
    expect(metadata.title).toBe("Nouveau mot de passe");
    render(
      <ResetFlowProvider>
        <NewPasswordPage />
      </ResetFlowProvider>,
    );
    expect(router.replace).toHaveBeenCalledWith("/mot-de-passe-oublie");
  });
});
