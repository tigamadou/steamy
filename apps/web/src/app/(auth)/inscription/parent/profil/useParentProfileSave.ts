"use client";

import type { Schemas } from "@steamy/api-client";
import { useRouter } from "next/navigation";

import { apiCall, type ApiFailure } from "@/lib/api-call";

/** Enregistre une étape du profil parent (`PATCH accounts/me/parent-profile/`) puis ouvre `next`. */
export function useParentProfileSave() {
  const router = useRouter();
  return async (body: Schemas["PatchedParentProfileUpdateRequest"], next: string): Promise<ApiFailure | null> => {
    const result = await apiCall((api) => api.PATCH("/api/accounts/me/parent-profile/", { body }));
    if (!result.ok) return result;
    router.replace(next);
    return null;
  };
}
