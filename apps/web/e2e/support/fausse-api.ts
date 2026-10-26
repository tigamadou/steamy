import { randomUUID } from "node:crypto";

import { expect, type BrowserContext } from "@playwright/test";

import type { Call } from "../fausse-api/server.ts";
import type { ScenarioName } from "../fausse-api/scenarios.ts";

const API_URL = process.env.FAUSSE_API_URL ?? "http://localhost:4010";

export type Session = {
  id: string;
  /** Appels reçus par la fausse API pour cette session (le journal garde aussi les requêtes refusées). */
  calls: () => Promise<Call[]>;
  /** Appels qui ont modifié des données, en `METHODE chemin`. */
  writes: () => Promise<string[]>;
};

/**
 * Connecte le navigateur sur une fixture : la fausse API lit le scénario dans le cookie de session, et son état est
 * propre à cette session (aucun test ne partage ni ne consomme la donnée d'un autre).
 */
export async function signInAs(context: BrowserContext, scenario: ScenarioName): Promise<Session> {
  const id = `${scenario}.${randomUUID()}`;
  await context.addCookies([{ name: "sessionid", value: id, url: "http://localhost:3100" }]);
  return session(id);
}

/** Pose le scénario que la connexion donnera à la session qu'elle crée (parcours « lien sans session »). */
export async function chooseScenario(context: BrowserContext, scenario: ScenarioName): Promise<void> {
  await context.addCookies([{ name: "fx_scenario", value: scenario, url: "http://localhost:3100" }]);
}

function session(id: string): Session {
  const calls = async () => (await (await fetch(`${API_URL}/__fx/calls?session=${encodeURIComponent(id)}`)).json()) as Call[];
  return {
    id,
    calls,
    writes: async () =>
      (await calls()).filter((call) => call.method !== "GET").map((call) => `${call.method} ${call.path.split("?")[0]}`),
  };
}

/** Aucun appel n'est sorti du contrat de la fausse API : un point d'accès absent ferait dériver le test du vrai écran. */
export async function expectNoUnhandledCall(current: Session): Promise<void> {
  const unhandled = (await current.calls()).filter((call) => !call.handled);
  expect(unhandled.map((call) => `${call.method} ${call.path}`)).toEqual([]);
}


/** Webhook du prestataire simulé : règle le dernier paiement en attente de la session. */
export async function settlePayment(current: Session, outcome: "success" | "failure"): Promise<void> {
  const response = await fetch(`${API_URL}/__fx/settle?session=${encodeURIComponent(current.id)}&outcome=${outcome}`);
  expect(response.status).toBe(200);
}
