import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EVENT, json } from "@/test/api-fixtures";

const cacheLife = vi.fn();
const cacheTag = vi.fn();
vi.mock("next/cache", () => ({ cacheLife, cacheTag }));

const { getEvent, getEventSlugs, getUpcomingEvents } = await import("./events");

let routes: Record<string, () => Response>;
let urls: string[];

beforeEach(() => {
  routes = {};
  urls = [];
  vi.stubEnv("API_URL", "http://api.test");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (request: Request) => {
      const url = new URL(request.url);
      urls.push(url.pathname + url.search);
      const handler = routes[url.pathname + url.search] ?? routes[url.pathname];
      return handler ? handler() : json({ code: "NOT_FOUND", message: "Introuvable" }, 404);
    }),
  );
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("événements publics", () => {
  it("liste les événements à venir, en cache étiqueté `events`", async () => {
    routes["/api/events/"] = () => json({ results: [EVENT] });
    expect(await getUpcomingEvents()).toEqual([EVENT]);
    expect(urls[0]).toBe("/api/events/?upcoming=true&pageSize=50");
    expect(cacheTag).toHaveBeenCalledWith("events");
    routes["/api/events/"] = () => json({});
    expect(await getUpcomingEvents()).toEqual([]);
  });

  it("lit une fiche, `null` si elle n'est pas publiée, erreur sinon", async () => {
    routes["/api/events/atelier/"] = () => json(EVENT);
    expect(await getEvent("atelier")).toEqual(EVENT);
    expect(await getEvent("brouillon")).toBeNull();
    routes["/api/events/panne/"] = () => json({ code: "SERVER_ERROR", message: "Panne" }, 500);
    await expect(getEvent("panne")).rejects.toThrow("Panne");
  });

  it("sitemap : tous les slugs, page après page", async () => {
    routes["/api/events/?page=1&pageSize=100"] = () => json({ next: "http://api.test/x", results: [EVENT] });
    routes["/api/events/?page=2&pageSize=100"] = () => json({ next: null });
    expect(await getEventSlugs()).toEqual(["atelier-electronique"]);
  });
});
