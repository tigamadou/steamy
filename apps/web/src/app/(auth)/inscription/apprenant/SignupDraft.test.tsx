import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import LearnerSignupLayout from "./layout";
import { RESUME_CODE_KEY, useSignupDraft } from "./SignupDraft";

function Probe() {
  const { draft, update } = useSignupDraft();
  return (
    <>
      <output data-testid="draft">{JSON.stringify(draft)}</output>
      <button type="button" onClick={() => update({ firstName: "Awa", age: 12 })}>
        Compléter
      </button>
      <button type="button" onClick={() => update({ username: "awa.k" })}>
        Identifiant
      </button>
    </>
  );
}

const draft = () => JSON.parse(screen.getByTestId("draft").textContent ?? "{}");

describe("SignupDraft", () => {
  it("garde le brouillon en mémoire sous le layout du flux, et le complète", async () => {
    render(LearnerSignupLayout({ children: <Probe /> } as LayoutProps<"/inscription/apprenant">));
    expect(draft()).toEqual({ firstName: "", lastName: "", username: "", privacyAccepted: false });
    await userEvent.click(screen.getByRole("button", { name: "Compléter" }));
    await userEvent.click(screen.getByRole("button", { name: "Identifiant" }));
    expect(draft()).toMatchObject({ firstName: "Awa", age: 12, username: "awa.k" });
    expect(RESUME_CODE_KEY).toBe("steamy:resumeCode");
  });

  it("refuse un usage hors du fournisseur", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow("useSignupDraft() doit être utilisé sous SignupDraftProvider");
    vi.restoreAllMocks();
  });
});
