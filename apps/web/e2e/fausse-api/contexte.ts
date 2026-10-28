import type { IncomingMessage, ServerResponse } from "node:http";

import type { Schemas } from "@steamy/api-client";

import type { Scenario } from "./base.ts";
import { apiError, RESERVATION_ACTIVE } from "./fixtures.ts";
import { messageOf, statusOf } from "./statuts.ts";

// Ce que les routes d'un écran partagent avec l'ossature du serveur : l'état d'une instance (une session de test), le
// contexte d'un appel et le registre des routes. Chaque écran vit dans `ecrans/<écran>.ts`, branche ses routes avec
// `route()` et déclare ses scénarios ; le serveur ne change pas quand un écran s'ajoute.

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

export type Behaviour = "success" | "failure" | "pending";

export type Call = { method: string; path: string; body: unknown; status: number; handled: boolean };

export type StoredOrder = { order: Schemas["Order"]; token: string | null; foreign: boolean };

/** État d'une session de test : propre à son identifiant, jamais partagé ni consommé par un autre test. */
export type Instance = {
  scenario: Scenario;
  request: Mutable<Schemas["PaymentRequest"]> | null;
  /** Dernière commande créée ou lue : celle du paiement en cours. */
  order: Schemas["Order"] | null;
  /** Commandes de l'instance par référence (créées, ou de départ), avec leur jeton invité. */
  store: Map<string, StoredOrder>;
  orders: number;
  /** Panier serveur : lignes numérotées (`id`), comme `shop/cart/items/{id}/`. */
  cart: Array<{ id: number; kitSlug: string; quantity: number }>;
  address: Schemas["DeliveryAddress"] | null;
  payments: Map<number, { payment: Schemas["Payment"]; behaviour: Behaviour }>;
  /** Incidents à usage unique déjà joués. */
  played: Set<string>;
  calls: Call[];
};

/** Corps des requêtes que la fausse API accepte (champs du contrat, tous facultatifs : le corps n'est pas validé). */
export type Body = Partial<
  Schemas["PaymentCreateRequest"] &
    Schemas["DeliveryAddressInputRequest"] &
    Schemas["OrderCreateRequest"] &
    Schemas["PaymentRequestDeclineRequest"]
>;

export type Respond = (status: number, body?: unknown, headers?: Record<string, string>) => void;

export type Context = {
  instance: Instance;
  match: RegExpMatchArray;
  body: Body;
  url: URL;
  request: IncomingMessage;
  response: ServerResponse;
  respond: Respond;
};

export type Handler = (context: Context) => void | Promise<void>;

/**
 * `true` : session exigée (401 sinon) et CSRF sur les requêtes qui modifient des données. `false` : public.
 * `"invite"` : ouvert à l'invité (jeton `X-Guest-Token` de la commande) ; CSRF seulement quand un compte est connecté.
 */
export type Auth = boolean | "invite";

export type Route = { method: string; path: RegExp; auth: Auth; handle: Handler };

export const routes: Route[] = [];

/** Branche une route : `auth` exige une session (401 sinon) et le jeton CSRF des requêtes qui modifient des données. */
export function route(method: string, path: RegExp, auth: Auth, handle: Handler) {
  routes.push({ method, path, auth, handle });
}

const seeders: Array<(instance: Instance) => void> = [];

/** Prépare l'état de départ d'une instance à sa création (commande déjà en attente, panier rempli…). */
export function onInstance(seed: (instance: Instance) => void) {
  seeders.push(seed);
}

export function newInstance(scenario: Scenario): Instance {
  const instance: Instance = {
    scenario,
    request: scenario.request && structuredClone(scenario.request),
    order: null,
    store: new Map(),
    orders: 0,
    cart: scenario.cart.map((item, index) => ({ id: index + 1, ...item })),
    address: scenario.address,
    payments: new Map(),
    played: new Set(),
    calls: [],
  };
  for (const { order, token, foreign } of scenario.orders) {
    const active = order.expiresAt === RESERVATION_ACTIVE;
    putOrder(instance, active ? { ...order, expiresAt: inMinutes(30) } : order, token ?? null, foreign ?? false);
  }
  for (const seed of seeders) seed(instance);
  return instance;
}

export const inMinutes = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();

/** Enregistre une commande (créée ou de départ) et en fait la commande courante du paiement. */
export function putOrder(instance: Instance, order: Schemas["Order"], token: string | null = null, foreign = false) {
  instance.store.set(order.reference, { order, token, foreign });
  if (!foreign) instance.order = order;
}

/** Remplace une commande déjà enregistrée (statut, paiement…), en gardant son jeton. */
export function updateOrder(instance: Instance, order: Schemas["Order"]) {
  const known = instance.store.get(order.reference);
  instance.store.set(order.reference, { order, token: known?.token ?? null, foreign: known?.foreign ?? false });
  if (instance.order?.reference === order.reference) instance.order = order;
}

/**
 * Commande lue par ce visiteur, ou `null` (404, sans dire pourquoi) : un compte connecté lit les siennes ; un invité,
 * celles dont il présente le jeton (`X-Guest-Token`).
 */
export function accessOrder({ instance, request }: Pick<Context, "instance" | "request">, reference: string): Schemas["Order"] | null {
  const entry = instance.store.get(reference);
  if (!entry || entry.foreign) return null;
  if (instance.scenario.me) return entry.token === null ? entry.order : null;
  return entry.token !== null && request.headers["x-guest-token"] === entry.token ? entry.order : null;
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Réponse d'erreur du contrat : statut et message lus dans `apps/api/libs/errors.py`, sauf message imposé. */
export function fail(respond: Respond, code: Schemas["ErrorCodeEnum"], message = messageOf(code), headers?: Record<string, string>) {
  respond(statusOf(code), apiError(code, message), headers);
}

/** Vrai la première fois seulement (incident à usage unique), si le scénario l'a demandé. */
export function once(instance: Instance, key: string, enabled: boolean | undefined): boolean {
  if (!enabled || instance.played.has(key)) return false;
  instance.played.add(key);
  return true;
}
