import type { Metadata } from "next";

import { CodeScreen } from "./CodeScreen";

export const metadata: Metadata = { title: "Code de vérification · Steamy" };

export default function CodePage() {
  return <CodeScreen />;
}
