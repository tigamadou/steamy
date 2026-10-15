import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getServerApi } from "@/lib/api";

import { STEP_PATH, type SignupState, type SignupStep } from "./signup-steps";

export { STEP_PATH, type SignupState, type SignupStep };

/**
 * Garde d'étape (à placer sous `<Suspense>`) : lit `GET auth/learner-signup/` avec la session « inscription en
 * cours ». Sans inscription en cours (ou expirée), reprise par code ; à une autre étape, l'écran de cette étape.
 */
export async function SignupGate({
  steps,
  children,
}: {
  steps: SignupStep[];
  children: (state: SignupState) => ReactNode;
}) {
  const api = await getServerApi();
  const { data, response } = await api.GET("/api/auth/learner-signup/");
  if (!data) {
    if (response.status >= 500) throw new Error(`Inscription illisible (${response.status})`);
    redirect("/inscription/reprendre");
  }
  if (!steps.includes(data.step)) redirect(STEP_PATH[data.step]);
  return children(data);
}
