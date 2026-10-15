import type { Schemas } from "@steamy/api-client";

export type SignupState = Schemas["LearnerSignupState"];
export type SignupStep = Schemas["StepEnum"];

/** Écran de chaque étape réelle de l'inscription en cours (W08 précède W10 : l'accord est annoncé d'abord). */
export const STEP_PATH: Record<SignupStep, string> = {
  parent: "/inscription/apprenant/parent",
  waiting: "/inscription/apprenant/attente",
  password: "/inscription/apprenant/accord",
  refused: "/inscription/apprenant/refus",
};
