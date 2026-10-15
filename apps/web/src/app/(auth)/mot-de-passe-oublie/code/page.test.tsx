import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const router = { push: vi.fn(), replace: vi.fn() };
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ POST: vi.fn() }) }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const { default: CodePage, metadata } = await import("./page");
const { ResetFlowProvider } = await import("../ResetFlow");

describe("Page WL03", () => {
  it("affiche l'écran du code sous le parcours (renvoi à WL02 sans défi)", () => {
    expect(metadata.title).toBe("Code de vérification");
    render(
      <ResetFlowProvider>
        <CodePage />
      </ResetFlowProvider>,
    );
    expect(router.replace).toHaveBeenCalledWith("/mot-de-passe-oublie");
  });
});
