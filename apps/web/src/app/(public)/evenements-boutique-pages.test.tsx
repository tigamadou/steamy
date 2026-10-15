import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { steamyEvent } from "@/test/api-fixtures";

vi.mock("@/components/public/events-sections", () => ({
  EventList: () => <p>liste</p>,
  EventView: () => <p>fiche</p>,
}));
vi.mock("@/components/public/shop-sections", () => ({
  ShopCatalog: () => <p>kits</p>,
  ShopCatalogSkeleton: () => null,
}));
const getEvent = vi.fn();
vi.mock("@/lib/events", () => ({ getEvent }));

const events = await import("./evenements/page");
const event = await import("./evenements/[slug]/page");
const { default: EventNotFound, metadata: notFoundMetadata } = await import("./evenements/[slug]/not-found");
const shop = await import("./boutique/page");

const props = (slug: string) => ({ params: Promise.resolve({ slug }) }) as PageProps<"/evenements/[slug]">;

describe("WL21 · /evenements", () => {
  it("titre, rappel de l'accord parental, liste ; pas de bandeau d'inscription", () => {
    render(events.default());
    expect(screen.getByRole("heading", { level: 1, name: "Événements & ateliers" })).toBeInTheDocument();
    expect(screen.getByText(/accord d'un parent/)).toBeInTheDocument();
    expect(screen.getByText("liste")).toBeInTheDocument();
    expect(screen.queryByText(/Inscris-toi en quelques secondes/)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Créer un compte" })).not.toBeInTheDocument();
  });
});

describe("WL23 · /evenements/[slug]", () => {
  it("place la fiche sous Suspense", () => {
    render(event.default(props("x")));
    expect(screen.getByText("fiche")).toBeInTheDocument();
  });

  it("métadonnées de l'événement, ou « introuvable »", async () => {
    getEvent.mockResolvedValueOnce(steamyEvent());
    expect(await event.generateMetadata(props("atelier-electronique"))).toMatchObject({
      title: "Atelier Électronique débutant",
      alternates: { canonical: "/evenements/atelier-electronique" },
    });
    getEvent.mockResolvedValueOnce(null);
    expect(await event.generateMetadata(props("x"))).toEqual({ title: "Événement introuvable" });
    getEvent.mockRejectedValueOnce(new Error("panne"));
    expect(await event.generateMetadata(props("x"))).toEqual({ title: "Événement introuvable" });
  });

  it("404 propre à l'événement", () => {
    render(<EventNotFound />);
    expect(screen.getByRole("heading", { name: "Cet événement est introuvable" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir les événements" })).toHaveAttribute("href", "/evenements");
    expect(notFoundMetadata.title).toBe("Événement introuvable");
  });
});

describe("WL07 · /boutique", () => {
  it("titre, kits et bandeau d'inscription", () => {
    render(shop.default({ searchParams: Promise.resolve({}) } as PageProps<"/boutique">));
    expect(screen.getByRole("heading", { level: 1, name: "Boutique de kits" })).toBeInTheDocument();
    expect(screen.getByText("kits")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Créer un compte" })).toBeInTheDocument();
  });
});
