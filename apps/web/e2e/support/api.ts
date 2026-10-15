import { expect, request, type APIRequestContext } from "@playwright/test";

import { DEMO_PASSWORD } from "./demo";
import { extractCode, waitForSms } from "./mailpit";

/**
 * Appels directs à l'API depuis les tests, pour préparer des données isolées (un compte neuf par test) sans passer
 * par les écrans. L'URL de l'API est celle que le front sert au navigateur (`/runtime-config`).
 */
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

export type ApiSession = {
  api: APIRequestContext;
  get: (path: string) => Promise<unknown>;
  post: (path: string, data: object) => Promise<unknown>;
  patch: (path: string, data: object) => Promise<unknown>;
};

export async function apiSession(): Promise<ApiSession> {
  const web = await request.newContext({ baseURL: BASE_URL });
  const { apiUrl } = (await (await web.get("/runtime-config")).json()) as { apiUrl: string };
  await web.dispose();
  const api = await request.newContext({ baseURL: apiUrl });
  await api.get("/api/auth/csrf/");
  // Django renouvelle le jeton CSRF à la connexion : il est relu dans le cookie avant chaque requête
  const csrfToken = async () =>
    (await api.storageState()).cookies.find((cookie) => cookie.name === "csrftoken")?.value ?? "";
  const send = async (method: "get" | "post" | "patch", path: string, data?: object) => {
    const response = await api[method](path, { data, headers: { "X-CSRFToken": await csrfToken() } });
    expect(response.ok(), `${method} ${path} → ${response.status()} ${await response.text()}`).toBe(true);
    return response.status() === 204 ? undefined : response.json();
  };
  return {
    api,
    get: (path) => send("get", path),
    post: (path, data) => send("post", path, data),
    patch: (path, data) => send("patch", path, data),
  };
}

let counter = 0;

/** Graine propre au processus : les workers Playwright tournent en parallèle et peuvent partir à la même milliseconde. */
const SEED = `${process.pid.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;

/** Numéro béninois E.164 propre au test (`+22901` + 8 chiffres aléatoires), distinct de ceux du jeu de démo. */
export function uniquePhone(): string {
  counter += 1;
  const random = Math.floor(Math.random() * 1e8)
    .toString()
    .padStart(8, "0");
  // Le jeu de démo utilise 0190000001 : on évite le préfixe 9000000
  return `+22901${random.startsWith("9000000") ? `8${random.slice(1)}` : random}`;
}

/** Suffixe court et unique pour les identifiants et noms de test. */
export function uniqueSuffix(): string {
  counter += 1;
  return `${Date.now().toString(36)}${SEED}${counter}`;
}

/**
 * Crée un parent par l'API (WP01-WP03), code lu dans le faux fournisseur SMS. Avec `completeProfile`, renseigne
 * aussi WP07 et WP09 : la connexion mène alors directement à `/parent`.
 */
export async function createParent({
  firstName = "Parent",
  password = DEMO_PASSWORD,
  completeProfile = true,
  phone = uniquePhone(),
  keep = false,
}: {
  firstName?: string;
  password?: string;
  completeProfile?: boolean;
  phone?: string;
  /** Garde la session API ouverte (connectée) et la renvoie, pour enchaîner des appels du parent. */
  keep?: boolean;
} = {}): Promise<{ phone: string; password: string; session?: ApiSession }> {
  const since = new Date();
  const session = await apiSession();
  const { post, patch, get, api } = session;
  const challenge = (await post("/api/auth/parent-signup/", {
    firstName,
    lastName: "Test",
    phone,
    privacyAccepted: true,
  })) as { challengeId: string };
  const code = extractCode(await waitForSms(phone, { since }));
  await post("/api/auth/parent-signup/verify/", { challengeId: challenge.challengeId, code });
  await post("/api/auth/parent-signup/password/", { password });
  if (completeProfile) {
    const [locality] = (await get("/api/referentials/localities/?country=BJ")) as { id: number }[];
    const [goal] = (await get("/api/referentials/goals/")) as { code: string }[];
    await patch("/api/accounts/me/parent-profile/", { locality: locality.id });
    await patch("/api/accounts/me/parent-profile/", { childrenToEnroll: 1, goalsForChildren: [goal.code] });
  }
  if (keep) return { phone, password, session };
  await api.dispose();
  return { phone, password };
}

/**
 * Décision du parent par l'API (WP05 / WP11), sans passer par les écrans : un parent neuf est créé au numéro qui a
 * reçu la demande, rattache la demande par le jeton du lien SMS, puis l'accepte ou la refuse.
 */
export async function decideConsent(
  link: URL,
  phone: string,
  decision: { accept: true } | { accept: false; reason?: string; note?: string },
): Promise<void> {
  const { session } = await createParent({ phone, keep: true, firstName: "Maman" });
  const { post, get, api } = session as ApiSession;
  const token = link.pathname.split("/").pop() as string;
  const request = (await post("/api/accounts/consent-requests/claim/", { token })) as { id: number };
  if (decision.accept) {
    await post(`/api/accounts/consent-requests/${request.id}/accept/`, {});
  } else {
    const [first] = (await get("/api/referentials/refusal-reasons/")) as { code: string }[];
    await post(`/api/accounts/consent-requests/${request.id}/refuse/`, {
      reason: decision.reason ?? first.code,
      note: decision.note ?? "",
    });
  }
  await api.dispose();
}

/** Identifiant d'apprenant libre (`auth/username-availability/`). */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  const { get, api } = await apiSession();
  const { available } = (await get(`/api/auth/username-availability/?username=${encodeURIComponent(username)}`)) as {
    available: boolean;
  };
  await api.dispose();
  return available;
}
