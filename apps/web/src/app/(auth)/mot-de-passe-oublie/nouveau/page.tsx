import type { Metadata } from "next";

import { NewPasswordScreen } from "./NewPasswordScreen";

export const metadata: Metadata = { title: "Nouveau mot de passe" };

export default function NewPasswordPage() {
  return <NewPasswordScreen />;
}
