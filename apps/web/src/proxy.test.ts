import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { config, proxy } from "./proxy";

function request(path: string, cookie?: string) {
  return new NextRequest(new URL(path, "http://web.test"), { headers: cookie ? { cookie } : {} });
}

describe("proxy", () => {
  it("renvoie vers la connexion avec le chemin demandé quand il n'y a pas de cookie de session", () => {
    const response = proxy(request("/parent/enfants/3?onglet=progres"));
    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/connexion");
    expect(location.searchParams.get("next")).toBe("/parent/enfants/3?onglet=progres");
  });

  it("laisse passer avec le chemin transmis au layout quand le cookie est présent", () => {
    const response = proxy(request("/apprenant", "sessionid=abc"));
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-request-x-steamy-path")).toBe("/apprenant");
  });

  it("ne garde que les espaces connectés", () => {
    expect(config.matcher).toEqual(["/apprenant/:path*", "/parent/:path*", "/enseignant/:path*"]);
  });
});
