import { SkeletonBlock } from "@/components/ds/SkeletonBlock";

import { getLearnerProfile } from "./api";
import { ProfileForm } from "./ProfileForm";

/** WD17, côté serveur : profil courant lu sous `<Suspense>`, puis le formulaire prérempli. */
export async function EditProfile() {
  const profile = await getLearnerProfile();
  return <ProfileForm profile={profile} />;
}

/** Squelette fidèle à WD17 pendant la lecture du profil. */
export function EditProfileSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Chargement de ton profil…" className="flex flex-col gap-4">
      <SkeletonBlock className="h-25 rounded-[18px]" />
      <SkeletonBlock className="h-140 rounded-[18px]" />
    </div>
  );
}
