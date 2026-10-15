/**
 * Comptes du jeu de démonstration (D2), chargé par `make seed` avant les parcours (`make e2e`).
 * Source : `apps/api/fixtures/README.md` et `apps/api/apps/core/demo.py`.
 */
export const DEMO_PASSWORD = "Steamy2026";

export const DEMO = {
  learner: { identifier: "lea.adjovi", firstName: "Léa", home: "/apprenant" },
  parent: { identifier: "+2290190000001", firstName: "Marie", home: "/parent" },
  teacher: { identifier: "koffi.adekambi@steamy.test", firstName: "Koffi", home: "/enseignant" },
} as const;

export type DemoRole = keyof typeof DEMO;
