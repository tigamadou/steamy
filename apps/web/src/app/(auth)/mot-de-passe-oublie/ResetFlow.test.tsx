import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { RESTART_NOTICE, ResetFlowProvider, useResetFlow } from "./ResetFlow";

function Probe() {
  const { flow, update } = useResetFlow();
  return (
    <>
      <output>{JSON.stringify(flow)}</output>
      <button type="button" onClick={() => update({ channel: "email", resetToken: "jeton" })}>
        Modifier
      </button>
      <button type="button" onClick={() => update({ resetToken: undefined, notice: RESTART_NOTICE })}>
        Réinitialiser
      </button>
    </>
  );
}

describe("ResetFlow", () => {
  it("démarre par SMS et fusionne les mises à jour", async () => {
    render(
      <ResetFlowProvider>
        <Probe />
      </ResetFlowProvider>,
    );
    expect(JSON.parse(screen.getByRole("status").textContent ?? "")).toEqual({ channel: "sms" });
    await userEvent.click(screen.getByRole("button", { name: "Modifier" }));
    expect(JSON.parse(screen.getByRole("status").textContent ?? "")).toEqual({ channel: "email", resetToken: "jeton" });
    await userEvent.click(screen.getByRole("button", { name: "Réinitialiser" }));
    expect(JSON.parse(screen.getByRole("status").textContent ?? "")).toEqual({
      channel: "email",
      notice: RESTART_NOTICE,
    });
  });

  it("refuse d'être utilisé hors du fournisseur", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow("useResetFlow() doit être utilisé sous ResetFlowProvider");
    vi.mocked(console.error).mockRestore();
  });
});
