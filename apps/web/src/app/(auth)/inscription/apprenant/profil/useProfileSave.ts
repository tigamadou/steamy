"use client";

import type { Schemas } from "@steamy/api-client";
import { useRouter } from "next/navigation";

import { apiCall, type ApiFailure } from "@/lib/api-call";
import { PROFILE_STEP_PATH, WELCOME_PATH } from "@/lib/auth/home-for-role";

type LearnerProfileUpdate = Schemas["PatchedLearnerProfileUpdateRequest"];

/**
 * Enregistre une étape du profil apprenant (`PATCH accounts/me/learner-profile/`, une étape par appel) puis ouvre
 * l'étape suivante donnée par l'API (`profileStep`), ou W15 quand le profil est complet. Renvoie l'échec sinon.
 */
export function useLearnerProfileSave() {
  const router = useRouter();
  return async (body: LearnerProfileUpdate): Promise<ApiFailure | null> => {
    const result = await apiCall((api) => api.PATCH("/api/accounts/me/learner-profile/", { body }));
    if (!result.ok) return result;
    const step = result.data.profileStep;
    router.replace(step ? PROFILE_STEP_PATH[step] : (WELCOME_PATH.learner as string));
    return null;
  };
}
