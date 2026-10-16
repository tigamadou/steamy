import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
const apiCall = vi.fn();
const post = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/lib/api-call", async (original) => ({
  ...(await original<typeof import("@/lib/api-call")>()),
  apiCall: (request: (api: unknown) => unknown) => {
    request({ POST: post });
    return apiCall();
  },
}));

const { SubmitReport } = await import("./SubmitReport");

const failure = (code: string) => ({ ok: false, code, message: "", fields: {} });

async function openAndSubmit(props = {}) {
  render(<SubmitReport period="2026-t4" label="T4 2026" entered={4} total={4} {...props} />);
  await userEvent.click(screen.getByRole("button", { name: "Soumettre" }));
  await userEvent.click(screen.getByRole("button", { name: "Soumettre le rapport" }));
}

describe("SubmitReport", () => {
  beforeEach(() => {
    refresh.mockReset();
    apiCall.mockReset();
    post.mockReset();
  });

  it("demande confirmation, prévient des indicateurs manquants, et s'annule", async () => {
    const { rerender } = render(<SubmitReport period="2026-t4" label="T4 2026" entered={2} total={4} />);
    await userEvent.click(screen.getByRole("button", { name: "Soumettre" }));
    expect(screen.getByRole("dialog", { name: "Soumettre le rapport T4 2026 ?" })).toBeInTheDocument();
    expect(screen.getByText(/verrouillé/)).toBeInTheDocument();
    expect(screen.getByText("2 indicateurs manuels ne sont pas renseignés.")).toBeInTheDocument();
    rerender(<SubmitReport period="2026-t4" label="T4 2026" entered={3} total={4} />);
    expect(screen.getByText("1 indicateur manuel n'est pas renseigné.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Soumettre" }));
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("soumet le trimestre puis relit la page", async () => {
    apiCall.mockResolvedValue({ ok: true, data: {} });
    await openAndSubmit();
    expect(post).toHaveBeenCalledWith("/api/backoffice/impact-reports/{period}/submit/", {
      params: { path: { period: "2026-t4" } },
    });
    expect(screen.queryByText(/ne sont pas renseignés/)).not.toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it.each(["REPORT_LOCKED", "OTP_REQUIRED"])("relit la page après %s", async (code) => {
    apiCall.mockResolvedValue(failure(code));
    await openAndSubmit();
    expect(refresh).toHaveBeenCalled();
  });

  it.each([
    ["PERMISSION_DENIED", "Votre groupe ne peut pas soumettre le rapport d'impact."],
    ["SERVER_ERROR", "Une erreur est survenue de notre côté. Réessayez dans quelques instants."],
  ])("affiche l'erreur %s dans la modale", async (code, message) => {
    apiCall.mockResolvedValue(failure(code));
    await openAndSubmit();
    expect(screen.getByRole("alert")).toHaveTextContent(message);
    expect(refresh).not.toHaveBeenCalled();
  });
});
