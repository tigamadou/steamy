import { connection } from "next/server";

import type { RuntimeConfig } from "@/lib/runtime-config";

/**
 * Configuration lue à l'exécution et servie au navigateur.
 *
 * Les variables NEXT_PUBLIC_* sont figées au build ; or la même image est promue
 * de staging à prod. Le navigateur récupère donc ses URLs ici, une fois par page.
 */
export async function GET() {
  await connection();
  const apiUrl = process.env.PUBLIC_API_URL;
  if (!apiUrl) {
    return Response.json({ detail: "PUBLIC_API_URL n'est pas défini" }, { status: 500 });
  }
  const config: RuntimeConfig = { apiUrl };
  return Response.json(config, { headers: { "Cache-Control": "public, max-age=300" } });
}
