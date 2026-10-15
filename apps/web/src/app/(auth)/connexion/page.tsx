import type { Metadata } from "next";
import { Suspense } from "react";

import { Loader } from "@/components/ds/Loader";
import { Mascot } from "@/components/ds/Mascot";
import { WebShell } from "@/components/ds/WebShell";

import { LoginGate } from "./LoginGate";

export const metadata: Metadata = { title: "Connexion · Steamy" };

// W16 · Connexion (SPEC-ECRANS-1 §2.7) : aucune donnée personnelle avant authentification.
export default function ConnexionPage({ searchParams }: PageProps<"/connexion">) {
  return (
    <WebShell
      title="Bon retour, on t'avait gardé une place !"
      sub="Connecte-toi pour reprendre tes parcours."
      brand={<Mascot pose="wave" size={220} hue="var(--surface)" />}
    >
      <Suspense fallback={<Loader label="Chargement…" />}>
        <LoginGate searchParams={searchParams} />
      </Suspense>
    </WebShell>
  );
}
