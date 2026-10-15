import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CATEGORY, KIT, steamyEvent } from "@/test/api-fixtures";

vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));
const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
vi.mock("next/navigation", () => ({ notFound }));
const getUpcomingEvents = vi.fn();
const getEvent = vi.fn();
vi.mock("@/lib/events", () => ({ getUpcomingEvents, getEvent }));
const getCategories = vi.fn();
vi.mock("@/lib/catalog", () => ({ getCategories }));
const getKits = vi.fn();
vi.mock("@/lib/shop", async (importOriginal) => ({ ...(await importOriginal<object>()), getKits }));

const { EventList, EventView } = await import("./events-sections");
const { ShopCatalog, ShopCatalogSkeleton } = await import("./shop-sections");

const params = (slug: string) => ({ params: Promise.resolve({ slug }) });

describe("WL21 · liste", () => {
  it("une ligne par événement à venir", async () => {
    getUpcomingEvents.mockResolvedValue([steamyEvent(), steamyEvent({ slug: "b", title: "B" })]);
    render(await EventList());
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("état vide", async () => {
    getUpcomingEvents.mockResolvedValue([]);
    render(await EventList());
    expect(screen.getByText("Aucun événement à venir")).toBeInTheDocument();
  });
});

describe("WL23 · fiche", () => {
  it("fiche, encart visiteur et données structurées Event", async () => {
    getEvent.mockResolvedValue(steamyEvent({ isFree: false, price: 5000 }));
    const { container } = render(await EventView(params("atelier-electronique")));
    expect(screen.getByRole("link", { name: "Participer" })).toBeInTheDocument();
    const jsonLd = JSON.parse(container.querySelector("script")!.innerHTML);
    expect(jsonLd).toMatchObject({
      "@type": "Event",
      startDate: "2026-11-05T13:00:00Z",
      location: { "@type": "Place", address: "Porto-Novo" },
      offers: { price: 5000, priceCurrency: "XOF", availability: "https://schema.org/InStock" },
    });
  });

  it("en ligne, gratuit et complet", async () => {
    getEvent.mockResolvedValue(steamyEvent({ online: true, seatsLeft: 0 }));
    const { container } = render(await EventView(params("x")));
    const jsonLd = JSON.parse(container.querySelector("script")!.innerHTML);
    expect(jsonLd.location["@type"]).toBe("VirtualLocation");
    expect(jsonLd.eventAttendanceMode).toBe("https://schema.org/OnlineEventAttendanceMode");
    expect(jsonLd.offers).toMatchObject({ price: 0, availability: "https://schema.org/SoldOut" });
  });

  it("payant sans prix renseigné : 0", async () => {
    getEvent.mockResolvedValue(steamyEvent({ isFree: false, price: undefined }));
    const { container } = render(await EventView(params("x")));
    expect(JSON.parse(container.querySelector("script")!.innerHTML).offers.price).toBe(0);
  });

  it("404 pour un événement non publié", async () => {
    getEvent.mockResolvedValue(null);
    await expect(EventView(params("brouillon"))).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("WL07 · boutique en vitrine", () => {
  it("filtres vers /boutique, cartes sans lien ni panier, pagination", async () => {
    getCategories.mockResolvedValue([CATEGORY]);
    getKits.mockResolvedValue({ results: [KIT], hasNext: true });
    render(await ShopCatalog({ searchParams: Promise.resolve({ categorie: "robotique" }) }));
    expect(getKits).toHaveBeenCalledWith({ category: "robotique", page: 1 });
    expect(screen.getByRole("link", { name: "Tous" })).toHaveAttribute("href", "/boutique");
    expect(screen.getByRole("link", { name: "Robotique" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("heading", { name: "Kits : Robotique" })).toBeInTheDocument();
    expect(screen.getByText("Steamy Bot v1")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Ajouter/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Suivant" })).toHaveAttribute(
      "href",
      "/boutique?categorie=robotique&page=2",
    );
  });

  it("catégorie inconnue : tous les kits ; aucun kit : état vide", async () => {
    getCategories.mockResolvedValue([CATEGORY]);
    getKits.mockResolvedValue({ results: [], hasNext: false });
    render(await ShopCatalog({ searchParams: Promise.resolve({ categorie: "disparue" }) }));
    expect(getKits).toHaveBeenLastCalledWith({ category: undefined, page: 1 });
    expect(screen.getByRole("heading", { name: "Tous les kits" })).toBeInTheDocument();
    expect(screen.getByText("Aucun kit dans cette catégorie")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir tous les kits" })).toHaveAttribute("href", "/boutique");
  });

  it("skeleton verbalisé", () => {
    render(<ShopCatalogSkeleton />);
    expect(screen.getByRole("status", { name: "Chargement des kits…" })).toBeInTheDocument();
  });
});
