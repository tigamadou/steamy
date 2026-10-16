import type { Schemas } from "@steamy/api-client";

export type Gender = Schemas["GenderEnum"];

/** Genre de l'apprenant (W12, WD17) : facultatif, finalité indiquée à côté (D6). Valeurs de `GenderEnum`. */
export const GENDERS: { value: Gender; emoji: string; label: string }[] = [
  { value: "female", emoji: "👧", label: "Fille" },
  { value: "male", emoji: "👦", label: "Garçon" },
  { value: "other", emoji: "🌟", label: "Autre" },
];
