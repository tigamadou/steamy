import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { KIT } from "@/test/api-fixtures";

vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));
const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
vi.mock("next/navigation", () => ({ notFound }));
const getKit = vi.fn();
const getDeliveryZones = vi.fn();
vi.mock("@/lib/shop", () => ({ getKit, getDeliveryZones }));
vi.mock("./AddToCartButton", () => ({
  AddToCartButton: ({ context, variant }: { context: string; variant: string }) => (
    <button type="button">{`Ajouter (${context}, ${variant})`}</button>
  ),
}));
vi.mock("./RestockAlertForm", () => ({
  RestockAlertForm: ({ context }: { context: string }) => <p>{`Alerte de réassort (${context})`}</p>,
}));

const { KitDetailSkeleton, KitDetailView } = await import("./KitDetailView");

const DETAIL = {
  ...KIT,
  description: "Tout le matériel pour construire.",
  contents: ["Notice illustrée", "Câbles"],
  images: ["/bot.jpg"],
  compatibleCourses: [{ slug: "decouverte-robotique", title: "Découverte de la robotique" }],
};
const ZONES = [{ id: 1, country: "BJ", name: "Cotonou", fee: 1000, delayLabel: "24 à 48 h" }];
const params = (slug = "steamy-bot-v1") => Promise.resolve({ slug });

beforeEach(() => {
  getKit.mockReset();
  getDeliveryZones.mockReset();
});

describe("WK02 · fiche kit", () => {
  it("invité : h1, galerie, contenu, parcours vers WL22, prix, stock, ajout et délais par zone", async () => {
    getKit.mockResolvedValue(DETAIL);
    getDeliveryZones.mockResolvedValue(ZONES);
    render(await KitDetailView({ params: params(), context: "public" }));
    expect(getKit).toHaveBeenCalledWith("steamy-bot-v1");
    expect(screen.getByRole("heading", { level: 1, name: "Steamy Bot v1" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Ce que contient le kit" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Boutique" })).toHaveAttribute("href", "/boutique");
    expect(screen.getByRole("img", { name: /Steamy Bot v1, photo 1/ })).toBeInTheDocument();
    expect(screen.getByText("Câbles")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Découverte de la robotique" })).toHaveAttribute(
      "href",
      "/parcours/decouverte-robotique",
    );
    const aside = screen.getByRole("complementary", { name: "Acheter Steamy Bot v1" });
    expect(within(aside).getByText(/35\s000 F CFA/)).toBeInTheDocument();
    expect(within(aside).getByText("En stock")).toBeInTheDocument();
    expect(within(aside).getByRole("button", { name: "Ajouter (public, detail)" })).toBeInTheDocument();
    expect(within(aside).getByText("Livraison selon votre zone")).toBeInTheDocument();
    expect(within(aside).getByText(/24 à 48 h · 1\s000 F CFA/)).toBeInTheDocument();
  });

  it("apprenant : h2 sous le header, parcours vers WC05 ; sans contenu, parcours ni zones", async () => {
    getKit.mockResolvedValue({ ...DETAIL, contents: [], compatibleCourses: [], images: undefined, emoji: "" });
    getDeliveryZones.mockRejectedValue(new Error("panne"));
    render(await KitDetailView({ params: params(), context: "learner" }));
    expect(screen.getByRole("heading", { level: 2, name: "Steamy Bot v1" })).toBeInTheDocument();
    expect(screen.queryByText("Ce que contient le kit")).not.toBeInTheDocument();
    expect(screen.queryByText("Parcours compatibles")).not.toBeInTheDocument();
    expect(screen.queryByText(/Livraison selon/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Boutique" })).toHaveAttribute("href", "/apprenant/boutique");
  });

  it("apprenant : parcours compatible vers WC05, délais au tutoiement", async () => {
    getKit.mockResolvedValue(DETAIL);
    getDeliveryZones.mockResolvedValue(ZONES);
    render(await KitDetailView({ params: params(), context: "learner" }));
    expect(screen.getByRole("heading", { level: 3, name: "Parcours compatibles" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Découverte de la robotique" })).toHaveAttribute(
      "href",
      "/apprenant/catalogue/decouverte-robotique",
    );
    expect(screen.getByText("Livraison selon ta zone")).toBeInTheDocument();
  });

  it("parent : fiche dans son espace (h2), boutique du parent, parcours public, délais au vouvoiement", async () => {
    getKit.mockResolvedValue(DETAIL);
    getDeliveryZones.mockResolvedValue(ZONES);
    render(await KitDetailView({ params: params(), context: "parent" }));
    expect(screen.getByRole("heading", { level: 2, name: "Steamy Bot v1" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Boutique" })).toHaveAttribute("href", "/parent/boutique");
    expect(screen.getByRole("link", { name: "Découverte de la robotique" })).toHaveAttribute(
      "href",
      "/parcours/decouverte-robotique",
    );
    expect(screen.getByText("Livraison selon votre zone")).toBeInTheDocument();
  });

  it("WK11 · rupture : « Indisponible », prix grisé, alerte de réassort et kits similaires", async () => {
    getKit.mockResolvedValue({ ...DETAIL, available: false });
    getDeliveryZones.mockResolvedValue([]);
    render(await KitDetailView({ params: params(), context: "learner" }));
    expect(screen.getByText("Indisponible")).toBeInTheDocument();
    expect(screen.getByText(/35\s000 F CFA/)).toHaveClass("text-ink-500");
    expect(screen.getByText("Alerte de réassort (learner)")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Ajouter/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir des kits similaires" })).toHaveAttribute(
      "href",
      "/apprenant/boutique?categorie=robotique",
    );
  });

  it("kit retiré de la vente : 404", async () => {
    getKit.mockResolvedValue(null);
    await expect(KitDetailView({ params: params("disparu"), context: "public" })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("silhouette verbalisée", () => {
    render(<KitDetailSkeleton />);
    expect(screen.getByRole("status", { name: "Chargement du kit…" })).toBeInTheDocument();
  });
});
