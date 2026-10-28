import { SCENARIOS_CHECKOUT_INVITE } from "./ecrans/checkout-invite.ts";
import { SCENARIOS_DEMANDE_PAIEMENT } from "./ecrans/demande-paiement.ts";

export { BASE, scenario, type Faults, type Scenario } from "./base.ts";

/**
 * Catalogue des scénarios : le nom est la fixture dont part chaque test (docs/tests/FIXTURES-FAUSSE-API.md). Chaque
 * écran déclare les siens dans `ecrans/<écran>.ts` ; ce catalogue les réunit (un nom ne peut pas servir deux fois).
 */
export const SCENARIOS = {
  ...SCENARIOS_DEMANDE_PAIEMENT,
  ...SCENARIOS_CHECKOUT_INVITE,
};

export type ScenarioName = keyof typeof SCENARIOS;

export function isScenario(name: string): name is ScenarioName {
  return name in SCENARIOS;
}
