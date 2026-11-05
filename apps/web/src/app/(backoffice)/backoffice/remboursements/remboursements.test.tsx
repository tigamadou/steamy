import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { backofficeRefund, refundPage } from "@/components/backoffice/payments/fixtures";

const requireGroups = vi.fn();
const apiGet = vi.fn();
vi.mock("@/lib/backoffice/guard", () => ({ requireGroups }));
vi.mock("@/lib/api", () => ({ getServerApi: async () => ({ GET: apiGet }) }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  usePathname: () => "/backoffice/remboursements",
  notFound: () => {
    throw new Error("notFound");
  },
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));

const ok = (data: unknown) => ({ data, response: new Response(null, { status: 200 }) });

async function renderPage(searchParams: Record<string, string> = {}) {
  const { default: Page } = await import("./page");
  render(await Page({ searchParams: Promise.resolve(searchParams) } as never));
}

describe("WAD17 · page Remboursements", () => {
  beforeEach(() => {
    requireGroups.mockReset().mockResolvedValue({ staffGroups: ["Finance"] });
    apiGet.mockReset().mockResolvedValue(ok(refundPage()));
  });

  it("exige Finance ou Super-admin et ouvre « À traiter » par défaut", async () => {
    await renderPage();
    expect(requireGroups).toHaveBeenCalledWith(["Finance", "Super-admin"]);
    expect(apiGet).toHaveBeenCalledWith("/api/backoffice/refunds/", { params: { query: { processed: false, page: 1 } } });
    expect(screen.getByRole("heading", { level: 1, name: "Remboursements" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "À traiter" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("table", { name: "Remboursements à traiter" })).toBeInTheDocument();
  });

  it("envoie processed=true pour « Traités »", async () => {
    apiGet.mockResolvedValue(ok(refundPage({ results: [backofficeRefund({ processed: true })] })));
    await renderPage({ onglet: "traites", page: "2" });
    expect(apiGet).toHaveBeenCalledWith("/api/backoffice/refunds/", { params: { query: { processed: true, page: 2 } } });
    expect(screen.getByRole("link", { name: "Traités" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("table", { name: "Remboursements traités" })).toBeInTheDocument();
  });

  it("un onglet inconnu retombe sur « À traiter »", async () => {
    await renderPage({ onglet: "autre" });
    expect(apiGet).toHaveBeenCalledWith("/api/backoffice/refunds/", { params: { query: { processed: false, page: 1 } } });
  });

  it("pagine en gardant l'onglet", async () => {
    apiGet.mockResolvedValue(ok(refundPage({ count: 60, next: "http://api/next", previous: "http://api/prev" })));
    await renderPage({ onglet: "traites", page: "2" });
    expect(screen.getByRole("link", { name: "Précédent" })).toHaveAttribute("href", "/backoffice/remboursements?onglet=traites");
    expect(screen.getByRole("link", { name: "Suivant" })).toHaveAttribute("href", "/backoffice/remboursements?onglet=traites&page=3");
    expect(screen.getByText(/60 remboursements/)).toBeInTheDocument();
  });

  it("accorde « remboursement » au singulier", async () => {
    apiGet.mockResolvedValue(ok(refundPage({ count: 1, next: "http://api/next" })));
    await renderPage();
    expect(screen.getByText(/1 remboursement ·/)).toBeInTheDocument();
  });

  it("remonte la panne de l'API à l'écran d'erreur", async () => {
    apiGet.mockResolvedValue({ error: { code: "SERVER_ERROR", message: "" }, response: new Response(null, { status: 500 }) });
    const { default: Page } = await import("./page");
    await expect(Page({ searchParams: Promise.resolve({}) } as never)).rejects.toThrow("réponse inattendue de l'API (500)");
  });
});
