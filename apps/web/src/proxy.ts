import { SESSION_COOKIE } from "@steamy/api-client";
import { NextResponse, type NextRequest } from "next/server";

import { PATH_HEADER } from "@/lib/auth/path-header";

/**
 * Contrôle optimiste des espaces connectés : sans cookie de session, retour à la connexion avec `?next=`.
 * L'autorisation réelle (session valide, rôle) est faite par le layout de chaque espace (`RoleGate`) et par l'API.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (!request.cookies.has(SESSION_COOKIE)) {
    const login = new URL("/connexion", request.url);
    login.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }
  const headers = new Headers(request.headers);
  headers.set(PATH_HEADER, `${pathname}${search}`);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/apprenant/:path*", "/parent/:path*", "/enseignant/:path*"],
};
