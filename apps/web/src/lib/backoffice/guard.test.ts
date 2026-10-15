import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const headerValues = vi.fn<(name: string) => string | null>();
const redirect = vi.fn((url: string) => {
  throw new Error(`redirect:${url}`);
});

vi.mock("@/lib/auth/session", () => ({ getCurrentUser }));
vi.mock("next/headers", () => ({ headers: async () => ({ get: headerValues }) }));
vi.mock("next/navigation", () => ({ redirect }));

const { backofficeLoginUrl, publicApiUrl, requireGroups, requireStaff } = await import("./guard");

const HEADERS: Record<string, string> = { host: "web.steamy.test:3000", "x-steamy-path": "/backoffice/impact" };
const verified = { isStaff: true, otpVerified: true, staffGroups: ["Contenu"] };
const login = (next: string) => `redirect:http://api.steamy.test:8000/admin/login/?next=${encodeURIComponent(next)}`;

describe("garde du back-office", () => {
  beforeEach(() => {
    vi.stubEnv("PUBLIC_API_URL", "http://api.steamy.test:8000");
    getCurrentUser.mockReset();
    headerValues.mockReset().mockImplementation((name) => HEADERS[name] ?? null);
  });
  afterEach(() => vi.unstubAllEnvs());

  it("laisse entrer le personnel vérifié par TOTP", async () => {
    getCurrentUser.mockResolvedValue(verified);
    await expect(requireStaff()).resolves.toBe(verified);
  });

  it.each([
    ["anonyme", null],
    ["un parent", { isStaff: false, otpVerified: false, staffGroups: [] }],
    ["le personnel sans TOTP", { isStaff: true, otpVerified: false, staffGroups: ["Finance"] }],
  ])("renvoie %s vers WAD15 avec retour à la page demandée", async (_, me) => {
    getCurrentUser.mockResolvedValue(me);
    await expect(requireStaff()).rejects.toThrow(login("http://web.steamy.test:3000/backoffice/impact"));
  });

  it("suit l'origine annoncée par le proxy inverse", async () => {
    HEADERS["x-forwarded-host"] = "admin.steamy.bj";
    HEADERS["x-forwarded-proto"] = "https";
    await expect(backofficeLoginUrl(null)).resolves.toBe(
      `http://api.steamy.test:8000/admin/login/?next=${encodeURIComponent("https://admin.steamy.bj/backoffice")}`,
    );
    delete HEADERS["x-forwarded-host"];
    delete HEADERS["x-forwarded-proto"];
  });

  it("renvoie vers l'accès refusé hors des groupes de la page", async () => {
    getCurrentUser.mockResolvedValue(verified);
    await expect(requireGroups(["Finance", "Super-admin"])).rejects.toThrow("redirect:/backoffice/acces-refuse");
    await expect(requireGroups(["Contenu"])).resolves.toBe(verified);
  });

  it("exige l'URL publique de l'API", () => {
    vi.stubEnv("PUBLIC_API_URL", "");
    expect(() => publicApiUrl()).toThrow("PUBLIC_API_URL n'est pas défini");
  });
});
