import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { json, KIT } from "@/test/api-fixtures";

vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));

const { getKits, KITS_PAGE_SIZE, toKitCard } = await import("./shop");

let handler: () => Response;
let urls: string[];

beforeEach(() => {
  urls = [];
  vi.stubEnv("API_URL", "http://api.test");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (request: Request) => {
      const url = new URL(request.url);
      urls.push(url.pathname + url.search);
      return handler();
    }),
  );
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("boutique publique", () => {
  it("lit une page de kits filtrée", async () => {
    handler = () => json({ next: "http://api.test/x", results: [KIT] });
    expect(await getKits({ category: "robotique" })).toEqual({ results: [KIT], hasNext: true });
    expect(urls[0]).toBe(`/api/shop/kits/?category=robotique&page=1&pageSize=${KITS_PAGE_SIZE}`);
    handler = () => json({});
    expect(await getKits({})).toEqual({ results: [], hasNext: false });
  });

  it("page au-delà de la dernière : vide ; autre erreur : propagée", async () => {
    handler = () => json({ code: "NOT_FOUND", message: "Page invalide" }, 404);
    expect(await getKits({ page: 9 })).toEqual({ results: [], hasNext: false });
    handler = () => json({ code: "SERVER_ERROR", message: "Panne" }, 500);
    await expect(getKits({})).rejects.toThrow("Panne");
  });

  it("carte vitrine : prix serveur et disponibilité sans stock exact", () => {
    expect(toKitCard(KIT)).toMatchObject({ name: "Steamy Bot v1", difficulty: "Débutant", availability: "in_stock" });
    expect(toKitCard({ ...KIT, available: false, emoji: "" })).toMatchObject({
      availability: "out_of_stock",
      emoji: "🤖",
    });
  });
});
