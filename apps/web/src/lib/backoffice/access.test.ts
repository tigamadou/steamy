import { describe, expect, it } from "vitest";

import { adminLoginUrl, adminUrl, backofficeNav, hasGroup, isVerifiedStaff, PAGE_GROUPS, STAFF_GROUPS } from "./access";

const API = "http://api.steamy.test:8000";
const staff = (staffGroups: string[], over = {}) => ({ isStaff: true, otpVerified: true, staffGroups, ...over });

describe("isVerifiedStaff", () => {
  it("n'admet que le personnel dont la session est vérifiée par TOTP", () => {
    expect(isVerifiedStaff(staff([]))).toBe(true);
    expect(isVerifiedStaff(staff([], { otpVerified: false }))).toBe(false);
    expect(isVerifiedStaff(staff([], { isStaff: false }))).toBe(false);
    expect(isVerifiedStaff(null)).toBe(false);
  });
});

describe("hasGroup", () => {
  it("ouvre une page sans groupe requis à tout le personnel", () => {
    expect(hasGroup({ staffGroups: [] }, PAGE_GROUPS.overview)).toBe(true);
  });

  it("réserve l'Impact Tracker à Finance et Super-admin", () => {
    expect(hasGroup({ staffGroups: [STAFF_GROUPS.finance] }, PAGE_GROUPS.impact)).toBe(true);
    expect(hasGroup({ staffGroups: [STAFF_GROUPS.superAdmin] }, PAGE_GROUPS.impact)).toBe(true);
    expect(hasGroup({ staffGroups: [STAFF_GROUPS.content, STAFF_GROUPS.support] }, PAGE_GROUPS.impact)).toBe(false);
  });
});

describe("adminLoginUrl", () => {
  it("renvoie vers WAD15 avec retour absolu vers la page demandée", () => {
    const url = new URL(adminLoginUrl(`${API}/`, "http://web.steamy.test:3000", "/backoffice/impact?periode=mois"));
    expect(url.origin + url.pathname).toBe(`${API}/admin/login/`);
    expect(url.searchParams.get("next")).toBe("http://web.steamy.test:3000/backoffice/impact?periode=mois");
  });

  it("ramène à l'accueil du back-office si le chemin est inconnu ou étranger", () => {
    for (const path of [null, "/parent"]) {
      const url = new URL(adminLoginUrl(API, "https://steamy.bj", path));
      expect(url.searchParams.get("next")).toBe("https://steamy.bj/backoffice");
    }
  });

  it("construit les pages de l'admin Django", () => {
    expect(adminUrl(`${API}//`)).toBe(`${API}/admin/`);
    expect(adminUrl(API, "shop/")).toBe(`${API}/admin/shop/`);
  });
});

describe("backofficeNav", () => {
  const labels = (groups: string[]) =>
    backofficeNav({ staffGroups: groups }, API).map((g) => [g.label, g.items.map((i) => i.label)]);

  it("montre tout au Super-admin, Pilotage en Next.js et le reste dans l'admin Django", () => {
    const nav = backofficeNav({ staffGroups: [STAFF_GROUPS.superAdmin] }, API);
    expect(nav.map((g) => g.label)).toEqual(["Pilotage", "Plateforme", "Système"]);
    expect(nav[0].items).toEqual([
      { id: "overview", label: "Vue d'ensemble", icon: "home", href: "/backoffice" },
      { id: "impact", label: "Impact Tracker", icon: "sparkle", href: "/backoffice/impact" },
    ]);
    expect(nav[1].items.every((i) => i.external && i.href.startsWith(`${API}/admin/`))).toBe(true);
    expect(nav[2].items.map((i) => i.href)).toEqual([
      `${API}/admin/auth/group/`,
      `${API}/admin/core/platformsettings/`,
    ]);
  });

  it("filtre les entrées selon les groupes (D71)", () => {
    expect(labels([STAFF_GROUPS.content])).toEqual([
      ["Pilotage", ["Vue d'ensemble"]],
      ["Plateforme", ["Contenu", "Boutique", "Steamy Events"]],
    ]);
    expect(labels([STAFF_GROUPS.support])).toEqual([
      ["Pilotage", ["Vue d'ensemble"]],
      ["Plateforme", ["Utilisateurs", "Modération", "Boutique", "Steamy Events"]],
    ]);
    expect(labels([STAFF_GROUPS.finance])).toEqual([
      ["Pilotage", ["Vue d'ensemble", "Impact Tracker"]],
      ["Plateforme", ["Paiements"]],
    ]);
    expect(labels([])).toEqual([["Pilotage", ["Vue d'ensemble"]]]);
  });
});
