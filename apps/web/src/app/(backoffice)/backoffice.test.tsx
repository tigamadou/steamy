import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BackofficeGate } from "@/components/backoffice/BackofficeGate";

const requireGroups = vi.fn();
const requireStaff = vi.fn();
const back = vi.fn();
vi.mock("@/lib/backoffice/guard", () => ({ requireGroups, requireStaff }));
vi.mock("@/components/backoffice/BackofficeGate", () => ({ BackofficeGate: () => null }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ back }), usePathname: () => "/backoffice" }));

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

  it("WAD01 est ouverte à tout le personnel, en attendant ses données (6.7)", async () => {
    const { default: Page } = await import("./backoffice/page");
    render(await Page());
    expect(requireGroups).toHaveBeenCalledWith([]);
    expect(screen.getByRole("heading", { level: 1, name: "Vue d'ensemble" })).toBeInTheDocument();
    expect(screen.getByText("Bonjour Awa")).toBeInTheDocument();
  });

  it("WAD01 salue sans prénom", async () => {
    requireGroups.mockResolvedValue(me({ firstName: "" }));
    const { default: Page } = await import("./backoffice/page");
    render(await Page());
    expect(screen.getByText("Bonjour")).toBeInTheDocument();
  });

  it("l'Impact Tracker revérifie le groupe Finance ou Super-admin", async () => {
    const { default: Page } = await import("./backoffice/impact/page");
    render(await Page());
    expect(requireGroups).toHaveBeenCalledWith(["Finance", "Super-admin"]);
    expect(screen.getByRole("heading", { level: 1, name: "Impact Tracker" })).toBeInTheDocument();
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
