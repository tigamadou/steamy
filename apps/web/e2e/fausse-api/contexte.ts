import type { IncomingMessage, ServerResponse } from "node:http";

import type { Schemas } from "@steamy/api-client";

import type { Scenario } from "./base.ts";
import { apiError } from "./fixtures.ts";
import { messageOf, statusOf } from "./statuts.ts";

// Ce que les routes d'un écran partagent avec l'ossature du serveur : l'état d'une instance (une session de test), le
// contexte d'un appel et le registre des routes. Chaque écran vit dans `ecrans/<écran>.ts`, branche ses routes avec
// `route()` et déclare ses scénarios ; le serveur ne change pas quand un écran s'ajoute.

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

export type Behaviour = "success" | "failure" | "pending";

export type Call = { method: string; path: string; body: unknown; status: number; handled: boolean };

/** État d'une session de test : propre à son identifiant, jamais partagé ni consommé par un autre test. */
export type Instance = {
  scenario: Scenario;
  request: Mutable<Schemas["PaymentRequest"]> | null;
  order: Schemas["Order"] | null;
  orders: number;
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

export type Route = { method: string; path: RegExp; auth: boolean; handle: Handler };

export const routes: Route[] = [];

/** Branche une route : `auth` exige une session (401 sinon) et le jeton CSRF des requêtes qui modifient des données. */
export function route(method: string, path: RegExp, auth: boolean, handle: Handler) {
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
    orders: 0,
    address: scenario.address,
    payments: new Map(),
    played: new Set(),
    calls: [],
  };
  for (const seed of seeders) seed(instance);
  return instance;
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
