import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { ProfileGate } from "@/components/auth/ProfileGate";
import { FullScreenStage } from "@/components/ds/FullScreenStage";
import { Loader } from "@/components/ds/Loader";
import { Mascot } from "@/components/ds/Mascot";
import { ProgressSteps } from "@/components/ds/ProgressSteps";
import { WebShell } from "@/components/ds/WebShell";
import type { ProfileStep } from "@/lib/auth/home-for-role";

import { AvatarStep } from "../AvatarStep";
import { GoalsStep } from "../GoalsStep";
import { InfoStep } from "../InfoStep";
import { SchoolStep } from "../SchoolStep";

type Step = { profileStep: ProfileStep; title: string; sub: string; brand: ReactNode; form: ReactNode };

// W11-W14 : une route par étape du profil apprenant, gardée par l'étape restante de l'API
const STEPS: Record<string, Step & { index: number }> = {
  infos: {
    index: 1,
    profileStep: "learner-info",
    title: "Parle-nous de toi",
    sub: "Pour te proposer des parcours adaptés à ton âge et à ta région.",
    brand: <Mascot pose="wave" size={220} hue="var(--surface)" />,
    form: <InfoStep />,
  },
  ecole: {
    index: 2,
    profileStep: "learner-school",
    title: "Ton école",
    sub: "On adaptera la difficulté et le ton.",
    brand: <Mascot pose="focus" size={220} hue="var(--surface)" />,
    form: <SchoolStep />,
  },
  objectifs: {
    index: 3,
    profileStep: "learner-goals",
    title: "Tes objectifs",
    sub: "Choisis ce qui t'intéresse, au moins 2 : tu pourras changer plus tard.",
    brand: <Mascot pose="cheer" size={220} hue="var(--surface)" />,
    form: <GoalsStep />,
  },
  avatar: {
    index: 4,
    profileStep: "learner-avatar",
    title: "Choisis ton avatar",
    sub: "C'est ta tête sur Steamy : tu pourras le changer plus tard.",
    brand: null,
    form: <AvatarStep />,
  },
};

export async function generateMetadata({ params }: PageProps<"/inscription/apprenant/profil/[etape]">): Promise<Metadata> {
  const { etape } = await params;
  return { title: STEPS[etape]?.title ?? "Ton profil" };
}

async function ProfileStepScreen({ params }: Pick<PageProps<"/inscription/apprenant/profil/[etape]">, "params">) {
  const { etape } = await params;
  const step = STEPS[etape];
  if (!step) notFound();
  const kicker = `Profil ${step.index}/4`;
  return (
    <ProfileGate role="learner" steps={[step.profileStep]}>
      {() =>
        // W14 en plein écran (grille d'avatars), W11-W13 dans le shell d'inscription
        step.profileStep === "learner-avatar" ? (
          <FullScreenStage topbar={<ProgressSteps step={4} total={4} label={kicker} className="max-w-[280px] flex-1" />}>
            <p className="text-xs font-extrabold tracking-[0.06em] text-primary-600 uppercase">{kicker}</p>
            <h1 className="text-3xl font-black text-ink-900">{step.title}</h1>
            <p className="font-semibold text-ink-600">{step.sub}</p>
            {step.form}
          </FullScreenStage>
        ) : (
          <WebShell
            kicker={kicker}
            progressLabel={kicker}
            title={step.title}
            sub={step.sub}
            step={step.index}
            total={4}
            brand={step.brand}
          >
            {step.form}
          </WebShell>
        )
      }
    </ProfileGate>
  );
}

export default function LearnerProfilePage({ params }: PageProps<"/inscription/apprenant/profil/[etape]">) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <Loader label="Chargement de ton profil…" />
        </div>
      }
    >
      <ProfileStepScreen params={params} />
    </Suspense>
  );
}
