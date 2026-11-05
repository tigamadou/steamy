import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { COUNTRY_LIST, NETWORK_LIST, paymentDetail, paymentPage } from "@/components/backoffice/payments/fixtures";

const requireGroups = vi.fn();
const apiGet = vi.fn();
const getCountries = vi.fn();
vi.mock("@/lib/backoffice/guard", () => ({ requireGroups }));
vi.mock("@/lib/api", () => ({ getServerApi: async () => ({ GET: apiGet }) }));
vi.mock("@/lib/referentials", () => ({ getCountries }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  usePathname: () => "/backoffice/paiements",
  notFound: () => {
    throw new Error("notFound");
  },
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));

const ok = (data: unknown) => ({ data, response: new Response(null, { status: 200 }) });

/** Réponses de l'API selon l'endpoint appelé. */
function api(payments: unknown, networks: unknown = ok(NETWORK_LIST)) {
  apiGet.mockImplementation(async (path: string) => (path === "/api/backoffice/payments/" ? payments : networks));
}

async function renderPage(searchParams: Record<string, string | string[]> = {}) {
  const { default: Page } = await import("./page");
  render(await Page({ searchParams: Promise.resolve(searchParams) } as never));
}

describe("WAD11 · page Paiements", () => {
  beforeEach(() => {
    requireGroups.mockReset().mockResolvedValue({ staffGroups: ["Finance"] });
    apiGet.mockReset();
    getCountries.mockReset().mockResolvedValue(COUNTRY_LIST);
  });

  it("exige Finance ou Super-admin et affiche totaux, filtres et tableau de l'API", async () => {
    api(ok(paymentPage()));
    await renderPage();
    expect(requireGroups).toHaveBeenCalledWith(["Finance", "Super-admin"]);
    expect(screen.getByRole("heading", { level: 1, name: "Paiements" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Volume encaissé" })).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Filtres des paiements" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Paiements Mobile Money" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Pagination" })).not.toBeInTheDocument();
  });

  it("traduit les filtres de l'URL vers les paramètres de l'API", async () => {
    api(ok(paymentPage()));
    await renderPage({ statut: "failed", reseau: "mtn", pays: "BJ", type: "kit", du: "2026-11-01", au: "2026-11-05", q: "CMD", page: "1" });
    expect(apiGet).toHaveBeenCalledWith("/api/backoffice/payments/", {
      params: { query: { status: "failed", network: "mtn", country: "BJ", kind: "kit", from: "2026-11-01", to: "2026-11-05", q: "CMD", page: 1 } },
    });
    expect(screen.getByLabelText("Statut")).toHaveValue("failed");
  });

  it("pagine en gardant les filtres", async () => {
    api(ok(paymentPage({ count: 40, next: "http://api/next", previous: "http://api/prev" })));
    await renderPage({ statut: "failed", page: "2" });
    expect(apiGet).toHaveBeenCalledWith("/api/backoffice/payments/", { params: { query: { status: "failed", page: 2 } } });
    expect(screen.getByRole("link", { name: "Précédent" })).toHaveAttribute("href", "/backoffice/paiements?statut=failed");
    expect(screen.getByRole("link", { name: "Suivant" })).toHaveAttribute("href", "/backoffice/paiements?statut=failed&page=3");
    expect(screen.getByText(/40 paiements/)).toBeInTheDocument();
  });

  it("accorde « paiement » au singulier", async () => {
    api(ok(paymentPage({ count: 1, next: "http://api/next" })));
    await renderPage();
    expect(screen.getByText(/1 paiement ·/)).toBeInTheDocument();
  });

  it("remonte la panne de l'API à l'écran d'erreur", async () => {
    api({ error: { code: "SERVER_ERROR", message: "" }, response: new Response(null, { status: 500 }) });
    const { default: Page } = await import("./page");
    await expect(Page({ searchParams: Promise.resolve({}) } as never)).rejects.toThrow("réponse inattendue de l'API (500)");
  });
});

describe("WAD16 · page Détail d'un paiement", () => {
  beforeEach(() => {
    requireGroups.mockReset().mockResolvedValue({ staffGroups: ["Finance"] });
    apiGet.mockReset();
  });

  const renderDetail = async (id: string) => {
    const { default: Page } = await import("./[id]/page");
    render(await Page({ params: Promise.resolve({ id }) } as never));
  };

  it("exige Finance ou Super-admin et lit le paiement demandé", async () => {
    apiGet.mockResolvedValue(ok(paymentDetail()));
    await renderDetail("1");
    expect(requireGroups).toHaveBeenCalledWith(["Finance", "Super-admin"]);
    expect(apiGet).toHaveBeenCalledWith("/api/backoffice/payments/{id}/", { params: { path: { id: 1 } } });
    expect(screen.getByRole("heading", { level: 1, name: "Paiement CMD-7001" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Commande" })).toBeInTheDocument();
  });

  it.each(["abc", "12x", "-3", "1.5"])("identifiant « %s » : introuvable, sans appeler l'API", async (id) => {
    await expect(renderDetail(id)).rejects.toThrow("notFound");
    expect(apiGet).not.toHaveBeenCalled();
  });

  it("paiement inconnu de l'API : introuvable", async () => {
    apiGet.mockResolvedValue({ error: { code: "NOT_FOUND", message: "" }, response: new Response(null, { status: 404 }) });
    await expect(renderDetail("99")).rejects.toThrow("notFound");
  });
});
