import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { ProfileGate } from "@/components/auth/ProfileGate";
import { Loader } from "@/components/ds/Loader";
import { Mascot } from "@/components/ds/Mascot";
import { WebShell } from "@/components/ds/WebShell";
import type { ProfileStep } from "@/lib/auth/home-for-role";

import { AboutStep } from "../AboutStep";
import { ChildrenStep } from "../ChildrenStep";
import { LocationStep } from "../LocationStep";

type Step = {
  index: number;
  /** Étapes restantes de l'API qui ouvrent l'écran : WP08, facultative, n'en est jamais une (`parent-children`). */
  profileSteps: ProfileStep[];
  title: string;
  sub: string;
  brand: ReactNode;
  form: ReactNode;
};

// WP07-WP09 : profil du parent, vouvoiement
const STEPS: Record<string, Step> = {
  localisation: {
    index: 1,
    profileSteps: ["parent-location"],
    title: "Où habitez-vous ?",
    sub: "Pour la facturation, la livraison des kits et les événements près de chez vous.",
    brand: <Mascot pose="wave" size={220} hue="var(--surface)" />,
    form: <LocationStep />,
  },
  "a-propos": {
    index: 2,
    profileSteps: ["parent-children"],
    title: "Parlez-nous de vous",
    sub: "Ces informations sont facultatives et nous aident à personnaliser votre accompagnement.",
    brand: <Mascot pose="focus" size={220} hue="var(--surface)" />,
    form: <AboutStep />,
  },
  enfants: {
    index: 3,
    profileSteps: ["parent-children"],
    title: "Vos enfants et vos objectifs",
    sub: "Pour adapter nos recommandations et le suivi. Choisissez au moins un objectif.",
    brand: <Mascot pose="cheer" size={220} hue="var(--surface)" />,
    form: <ChildrenStep />,
  },
};

export async function generateMetadata({ params }: PageProps<"/inscription/parent/profil/[etape]">): Promise<Metadata> {
  const { etape } = await params;
  return { title: STEPS[etape]?.title ?? "Votre profil" };
}

async function ParentProfileStep({ params }: Pick<PageProps<"/inscription/parent/profil/[etape]">, "params">) {
  const { etape } = await params;
  const step = STEPS[etape];
  if (!step) notFound();
  const kicker = `Profil parent ${step.index}/3`;
  return (
    <ProfileGate role="parent" steps={step.profileSteps}>
      {() => (
        <WebShell
          kicker={kicker}
          progressLabel={kicker}
          title={step.title}
          sub={step.sub}
          step={step.index}
          total={3}
          brand={step.brand}
        >
          {step.form}
        </WebShell>
      )}
    </ProfileGate>
  );
}

export default function ParentProfilePage({ params }: PageProps<"/inscription/parent/profil/[etape]">) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <Loader label="Chargement de votre profil…" />
        </div>
      }
    >
      <ParentProfileStep params={params} />
    </Suspense>
  );
}
