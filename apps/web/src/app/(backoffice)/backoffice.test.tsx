import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BackofficeGate } from "@/components/backoffice/BackofficeGate";
import { DASHBOARD, DETAIL } from "@/test/impact-fixtures";

const requireGroups = vi.fn();
const requireStaff = vi.fn();
const back = vi.fn();
const publicApiUrl = vi.fn(() => "http://api.steamy.test:8000");
const apiGet = vi.fn();
vi.mock("@/lib/backoffice/guard", () => ({ requireGroups, requireStaff, publicApiUrl }));
vi.mock("@/lib/api", () => ({ getServerApi: async () => ({ GET: apiGet }) }));
vi.mock("@/components/backoffice/BackofficeGate", () => ({ BackofficeGate: () => null }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ back }),
  usePathname: () => "/backoffice",
  notFound: () => {
    throw new Error("notFound");
  },
}));

const OVERVIEW = {
  period: { key: "2026-10", label: "Octobre 2026", start: "2026-10-01", end: "2026-10-31" },
  highlight: {
    code: "na",
    label: "Nouveaux apprenants",
    value: 12,
    target: 200,
    status: { status: "off_target", tone: "error", label: "Hors-cible" },
  },
  stats: { users: 40, activeLearners: 12, salesMonth: null, completionRate: null },
  report: { period: "2026-t4", label: "T4 2026", dueDate: "2027-01-15", status: "draft", entered: 0, total: 12 },
  todo: [
    {
      kind: "consents_pending",
      label: "Consentements en attente",
      count: 2,
      adminPath: "/admin/accounts/consentrequest/?status__exact=pending",
    },
  ],
};

const me = (over = {}) => ({ firstName: "Awa", staffGroups: ["Contenu"], ...over });

describe("layout du back-office", () => {
  it("garde l'espace sous Suspense, sans indexation", async () => {
    const { default: Layout, metadata } = await import("./layout");
    const tree = Layout({ children: "page" } as never) as ReactElement<{ fallback: ReactNode; children: ReactElement }>;
    expect(tree.props.children.type).toBe(BackofficeGate);
    expect(tree.props.children.props).toEqual({ children: "page" });
    render(<>{tree.props.fallback}</>);
    expect(screen.getByText("Ouverture du back-office…")).toBeInTheDocument();
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});

describe("pages du back-office", () => {
  beforeEach(() => {
    requireGroups.mockReset().mockResolvedValue(me());
    requireStaff.mockReset().mockResolvedValue(me());
  });

  it("WAD01 est ouverte à tout le personnel et lit la vue d'ensemble du serveur", async () => {
    apiGet.mockResolvedValue({ data: OVERVIEW, response: new Response(null, { status: 200 }) });
    const { default: Page } = await import("./backoffice/page");
    render(await Page());
    expect(requireGroups).toHaveBeenCalledWith([]);
    expect(apiGet).toHaveBeenCalledWith("/api/backoffice/overview/");
    expect(screen.getByRole("heading", { level: 1, name: "Vue d'ensemble" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Consentements en attente/ })).toHaveAttribute(
      "href",
      "http://api.steamy.test:8000/admin/accounts/consentrequest/?status__exact=pending",
    );
    // Contenu n'ouvre pas l'Impact Tracker
    expect(screen.queryByRole("link", { name: "Voir l'Impact Tracker" })).not.toBeInTheDocument();
  });

  it("WAD01 propose l'Impact Tracker à Finance", async () => {
    requireGroups.mockResolvedValue(me({ staffGroups: ["Finance"] }));
    apiGet.mockResolvedValue({ data: OVERVIEW, response: new Response(null, { status: 200 }) });
    const { default: Page } = await import("./backoffice/page");
    render(await Page());
    expect(screen.getByRole("link", { name: "Voir l'Impact Tracker" })).toBeInTheDocument();
  });

  it("WAD01 laisse une panne de l'API à error.tsx (WX02)", async () => {
    apiGet.mockResolvedValue({ error: { code: "SERVER_ERROR" }, response: new Response(null, { status: 500 }) });
    const { default: Page } = await import("./backoffice/page");
    await expect(Page()).rejects.toThrow("réponse inattendue de l'API (500)");
  });

  it("WAD02 revérifie le groupe Finance ou Super-admin et lit les KPI de la période de l'URL", async () => {
    apiGet.mockResolvedValue({ data: DASHBOARD, response: new Response(null, { status: 200 }) });
    const { default: Page } = await import("./backoffice/impact/page");
    render(await Page({ searchParams: Promise.resolve({ periode: "trimestre" }) } as never));
    expect(requireGroups).toHaveBeenCalledWith(["Finance", "Super-admin"]);
    expect(apiGet).toHaveBeenCalledWith("/api/backoffice/kpis/", { params: { query: { period: "quarter" } } });
    expect(screen.getByRole("heading", { level: 1, name: "Impact Tracker" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Trimestre" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("region", { name: "Ventes réalisées" })).toBeInTheDocument();
  });

  it("WAD03 lit l'indicateur demandé pour la période de l'URL", async () => {
    apiGet.mockResolvedValue({ data: DETAIL, response: new Response(null, { status: 200 }) });
    const { default: Page } = await import("./backoffice/impact/indicateurs/[code]/page");
    render(await Page({ params: Promise.resolve({ code: "na" }), searchParams: Promise.resolve({}) } as never));
    expect(requireGroups).toHaveBeenCalledWith(["Finance", "Super-admin"]);
    expect(apiGet).toHaveBeenCalledWith("/api/backoffice/kpis/{code}/", {
      params: { path: { code: "na" }, query: { period: "month" } },
    });
    expect(screen.getByRole("heading", { level: 1, name: "Détail de l'indicateur" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Définition" })).toBeInTheDocument();
  });

  it("WAD03 traite un indicateur inconnu en 404", async () => {
    apiGet.mockResolvedValue({ error: { code: "NOT_FOUND" }, response: new Response(null, { status: 404 }) });
    const { default: Page } = await import("./backoffice/impact/indicateurs/[code]/page");
    await expect(
      Page({ params: Promise.resolve({ code: "inconnu" }), searchParams: Promise.resolve({}) } as never),
    ).rejects.toThrow("notFound");
  });

  it("l'accès refusé rappelle le groupe et ramène à la vue d'ensemble", async () => {
    const { default: Page } = await import("./backoffice/acces-refuse/page");
    render(await Page());
    expect(screen.getByRole("heading", { level: 1, name: "Accès refusé" })).toBeInTheDocument();
    expect(screen.getByText(/appartient au groupe Contenu/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retour à la vue d'ensemble" })).toHaveAttribute("href", "/backoffice");
  });

  it("l'accès refusé traite un compte sans groupe", async () => {
    requireStaff.mockResolvedValue(me({ staffGroups: [] }));
    const { default: Page } = await import("./backoffice/acces-refuse/page");
    render(await Page());
    expect(screen.getByText(/n'appartient à aucun groupe/)).toBeInTheDocument();
  });
});

describe("états du back-office", () => {
  it("le chargement montre un skeleton et verbalise l'attente (WX03)", async () => {
    const { default: Loading } = await import("./backoffice/loading");
    render(<Loading />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Chargement en cours…")).toBeInTheDocument();
  });

  it("la page introuvable reste dans le shell et ramène à la vue d'ensemble", async () => {
    const { default: NotFound } = await import("./backoffice/not-found");
    render(<NotFound />);
    expect(screen.getByRole("heading", { level: 1, name: "Page introuvable" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retour à la vue d'ensemble" })).toHaveAttribute("href", "/backoffice");
  });

  it("l'erreur affiche WX02 au registre neutre, avec retour et nouvel essai", async () => {
    const { default: BackofficeError } = await import("./backoffice/error");
    const retry = vi.fn();
    render(<BackofficeError error={new Error("boom")} retry={retry} />);
    expect(screen.getByRole("heading", { name: "Chargement impossible" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    await userEvent.click(screen.getByRole("button", { name: "Retour" }));
    expect(retry).toHaveBeenCalled();
    expect(back).toHaveBeenCalled();
  });
});
