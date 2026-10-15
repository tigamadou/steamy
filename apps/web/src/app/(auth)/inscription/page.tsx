import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { SignedInRedirect } from "@/components/auth/SignedInRedirect";
import { Button } from "@/components/ds/Button";
import { Mascot } from "@/components/ds/Mascot";
import { WebShell } from "@/components/ds/WebShell";
import { stats } from "@/content/site";
import { routes } from "@/lib/routes";

import { Splash } from "./Splash";

export const metadata: Metadata = { title: "Inscription" };

// Arguments de W02 (SPEC-ECRANS §2.5), contenu éditorial (D10)
const ARGUMENTS = [
  { emoji: "🤖", title: "Parcours guidés", text: "Robotique, IA, code" },
  { emoji: "📦", title: "Kits physiques", text: "Livrés chez toi" },
  { emoji: "🏆", title: "Challenges", text: "Concours et Steamy Events" },
  { emoji: "👨‍👩‍👧", title: "Suivi parent", text: "En toute sécurité" },
] as const;

// Chiffre vitrine du panneau marque (D10) : nombre d'apprenants du contenu éditorial
const learners = stats.find((stat) => stat.label === "Apprenants");

// W02 · Accueil de l'inscription, précédé du splash W01 (une fois par session)
export default function SignupWelcomePage() {
  return (
    <>
      <Splash />
      <Suspense fallback={null}>
        <SignedInRedirect />
      </Suspense>
      <WebShell
        kicker="Bienvenue"
        title={
          <>
            Apprends à <span className="text-primary-600">construire</span> les robots de demain.
          </>
        }
        sub="Steamy, ce sont des parcours STEM ludiques, des kits et des challenges pour les 10–17 ans."
        brand={
          <>
            <Mascot pose="cheer" size={240} hue="var(--surface)" />
            {learners && (
              <p className="rounded-pill bg-white/15 px-5 py-3 text-sm font-extrabold">
                {learners.value} {learners.label.toLowerCase()} déjà inscrits
              </p>
            )}
          </>
        }
        cta={
          <>
            <Button href="/inscription/type" block size="lg" iconRight="arrow-right">
              Créer un compte gratuit
            </Button>
            <Button href={routes.login()} variant="outline" block>
              J&apos;ai déjà un compte
            </Button>
            <p className="text-center text-sm font-bold text-ink-600">
              Inscription en attente ?{" "}
              <Link href="/inscription/reprendre" className="font-black text-primary-600 underline">
                Reprendre mon inscription
              </Link>
            </p>
            <p className="text-center text-xs font-semibold text-ink-600">
              En continuant, tu acceptes nos{" "}
              <Link href={routes.legal("cgu")} className="font-bold text-primary-600 underline">
                conditions d&apos;utilisation
              </Link>{" "}
              et notre{" "}
              <Link href={routes.legal("confidentialite")} className="font-bold text-primary-600 underline">
                politique de confidentialité
              </Link>
              .
            </p>
          </>
        }
      >
        <ul className="grid grid-cols-2 gap-3">
          {ARGUMENTS.map((argument) => (
            <li key={argument.title} className="rounded-xl border-2 border-ink-100 bg-surface p-4">
              <span aria-hidden className="mb-1.5 block text-2xl">
                {argument.emoji}
              </span>
              <span className="block text-sm font-extrabold text-ink-900">{argument.title}</span>
              <span className="block text-xs font-semibold text-ink-600">{argument.text}</span>
            </li>
          ))}
        </ul>
      </WebShell>
    </>
  );
}
