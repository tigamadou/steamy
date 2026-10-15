import type { Metadata } from "next";

import { ForgotScreen } from "./ForgotScreen";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function ForgotPage() {
  return <ForgotScreen />;
}
