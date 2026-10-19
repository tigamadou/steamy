import type { Metadata } from "next";
import { Suspense } from "react";

import { ProfileHub, ProfileHubSkeleton } from "@/features/account/ProfileHub";

export const metadata: Metadata = { title: "Mon profil" };

// WD13 · Paramètres de l'apprenant. Le h1 est le titre du header du shell (« Profil »).
export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileHubSkeleton />}>
      <ProfileHub />
    </Suspense>
  );
}
