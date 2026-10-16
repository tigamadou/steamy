import type { Metadata } from "next";

import { ProfileBreadcrumb } from "@/features/account/EditProfile";
import { PasswordForm } from "@/features/account/PasswordForm";

export const metadata: Metadata = { title: "Changer de mot de passe" };

// WD18 · Changer son mot de passe. Le h1 est le titre du header du shell (« Mot de passe »).
export default function PasswordPage() {
  return (
    <div className="mx-auto flex w-full max-w-140 flex-col gap-4">
      <ProfileBreadcrumb current="Mot de passe" />
      <h2 className="m-0 text-lg font-black text-ink-900">Changer le mot de passe</h2>
      <PasswordForm />
    </div>
  );
}
