import type { Metadata } from "next";
import { Suspense } from "react";

import { EditProfile, EditProfileSkeleton, ProfileBreadcrumb } from "@/features/account/EditProfile";

export const metadata: Metadata = { title: "Modifier mon profil" };

// WD17 · Modifier son profil. Le h1 est le titre du header du shell (« Modifier mon profil »).
export default function EditProfilePage() {
  return (
    <div className="mx-auto flex w-full max-w-160 flex-col gap-4">
      <ProfileBreadcrumb current="Mes informations" />
      <h2 className="sr-only">Mes informations</h2>
      <Suspense fallback={<EditProfileSkeleton />}>
        <EditProfile />
      </Suspense>
    </div>
  );
}
