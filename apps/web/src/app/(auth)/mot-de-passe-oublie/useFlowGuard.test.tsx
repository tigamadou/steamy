import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const router = { replace: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const { RESTART_NOTICE, ResetFlowProvider, useResetFlow } = await import("./ResetFlow");
const { useFlowGuard } = await import("./useFlowGuard");

function Step({ ready }: { ready: boolean }) {
  const { flow } = useResetFlow();
  const visible = useFlowGuard(ready);
  return (
    <>
      <p>{visible ? "Étape affichée" : "Étape masquée"}</p>
      <p>{flow.notice ?? "Aucun message"}</p>
    </>
  );
}

describe("useFlowGuard", () => {
  beforeEach(() => router.replace.mockReset());

  it("laisse passer une étape dont l'état est présent", () => {
    render(
      <ResetFlowProvider>
        <Step ready />
      </ResetFlowProvider>,
    );
    expect(screen.getByText("Étape affichée")).toBeInTheDocument();
    expect(screen.getByText("Aucun message")).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("renvoie à WL02 avec un message quand l'état manque", () => {
    render(
      <ResetFlowProvider>
        <Step ready={false} />
      </ResetFlowProvider>,
    );
    expect(screen.getByText("Étape masquée")).toBeInTheDocument();
    expect(screen.getByText(RESTART_NOTICE)).toBeInTheDocument();
    expect(router.replace).toHaveBeenCalledWith("/mot-de-passe-oublie");
  });
});
