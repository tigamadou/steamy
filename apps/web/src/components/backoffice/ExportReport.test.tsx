import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
const post = vi.fn();
const get = vi.fn();
const apiCall = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/lib/api-call", async (original) => ({
  ...(await original<typeof import("@/lib/api-call")>()),
  apiCall: (request: (api: unknown) => unknown) => {
    request({ POST: post, GET: get });
    return apiCall();
  },
}));

const { ExportReport, MAX_POLLS, POLL_MS } = await import("./ExportReport");

const item = (over = {}) => ({
  id: 7,
  period: "2026-t4",
  format: "csv" as const,
  status: "pending" as const,
  createdAt: "2026-10-16T09:00:00Z",
  downloadPath: null,
  ...over,
});
const ok = (data: object) => ({ ok: true, data });
const failure = (code: string) => ({ ok: false, code, message: "", fields: {} });

/** Fait avancer l'interrogation d'un tour. */
async function tick() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(POLL_MS);
  });
}

describe("ExportReport", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    refresh.mockReset();
    post.mockReset();
    get.mockReset();
    apiCall.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  function setup() {
    render(<ExportReport period="2026-t4" apiUrl="http://api.test/" />);
    return userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  }

  it("demande l'export, interroge son état puis propose le téléchargement", async () => {
    apiCall
      .mockResolvedValueOnce(ok(item()))
      .mockResolvedValueOnce(ok(item()))
      .mockResolvedValueOnce(ok(item({ status: "ready", downloadPath: "/api/backoffice/exports/7/download/" })));
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Exporter CSV" }));
    expect(post).toHaveBeenCalledWith("/api/backoffice/impact-reports/{period}/exports/", {
      params: { path: { period: "2026-t4" } },
      body: { format: "csv" },
    });
    expect(screen.getByRole("status")).toHaveTextContent("Préparation de l'export CSV…");
    expect(screen.getByRole("button", { name: "Exporter PDF" })).toBeDisabled();
    await tick();
    expect(get).toHaveBeenCalledWith("/api/backoffice/exports/{id}/", { params: { path: { id: 7 } } });
    await tick();
    expect(screen.getByRole("status")).toHaveTextContent("Export CSV prêt");
    expect(screen.getByRole("link", { name: "Télécharger le CSV" })).toHaveAttribute(
      "href",
      "http://api.test/api/backoffice/exports/7/download/",
    );
    expect(screen.getByRole("button", { name: "Exporter PDF" })).toBeEnabled();
  });

  it("signale un export en échec", async () => {
    apiCall.mockResolvedValueOnce(ok(item({ format: "pdf" }))).mockResolvedValueOnce(ok(item({ format: "pdf", status: "failed" })));
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Exporter PDF" }));
    await tick();
    expect(screen.getByRole("alert")).toHaveTextContent("L'export PDF n'a pas pu être généré. Réessayez.");
  });

  it("abandonne après un nombre maximal d'interrogations", async () => {
    apiCall.mockResolvedValue(ok(item()));
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Exporter CSV" }));
    for (let i = 0; i < MAX_POLLS; i += 1) await tick();
    expect(screen.getByRole("alert")).toHaveTextContent("n'a pas pu être généré");
  });

  it.each([
    ["PERMISSION_DENIED", "Votre groupe ne peut pas exporter le rapport d'impact."],
    ["SERVER_ERROR", "Une erreur est survenue de notre côté."],
  ])("affiche l'erreur %s à la demande", async (code, message) => {
    apiCall.mockResolvedValueOnce(failure(code));
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Exporter CSV" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(message));
  });

  it("relit la page quand la session n'est plus vérifiée, y compris pendant l'interrogation", async () => {
    apiCall.mockResolvedValueOnce(ok(item())).mockResolvedValueOnce(failure("OTP_REQUIRED"));
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Exporter CSV" }));
    await tick();
    expect(refresh).toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeEmptyDOMElement();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("cesse d'interroger une fois démonté", async () => {
    apiCall.mockResolvedValue(ok(item()));
    const { unmount } = render(<ExportReport period="2026-t4" apiUrl="http://api.test" />);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByRole("button", { name: "Exporter CSV" }));
    unmount();
    await tick();
    expect(get).not.toHaveBeenCalled();
  });
});
