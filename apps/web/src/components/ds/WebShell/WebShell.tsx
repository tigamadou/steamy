import Link from "next/link";
import type { ReactNode } from "react";

import { cx } from "@/lib/cx";

import { Logo } from "../Logo";
import { ProgressSteps } from "../ProgressSteps";

// Points lumineux du décor (design/screens-auth-web.jsx, `WebShell`).
const DOTS = [
  { position: "left-[15%] top-[20%]", size: "size-2", tone: "bg-amber-400 shadow-[0_0_20px_var(--amber-400)]" },
  { position: "left-[78%] top-[18%]", size: "size-1.5", tone: "bg-white shadow-[0_0_20px_var(--color-white)]" },
  { position: "left-[85%] top-[78%]", size: "size-2.5", tone: "bg-amber-400 shadow-[0_0_20px_var(--amber-400)]" },
  { position: "left-[12%] top-[85%]", size: "size-1.5", tone: "bg-white shadow-[0_0_20px_var(--color-white)]" },
] as const;

export type WebShellProps = {
  /** Sur-titre en capitales (ex. « Inscription · étape 1/4 »). */
  kicker?: ReactNode;
  /** Titre de la page, rendu en `<h1>`. */
  title: ReactNode;
  sub?: ReactNode;
  /** Étape courante : affiche la barre de progression dans la topbar. */
  step?: number;
  total?: number;
  /** Texte annoncé par la barre de progression à la place de « Étape n sur N ». */
  progressLabel?: string;
  children?: ReactNode;
  /** Actions sous le contenu (boutons, liens). */
  cta?: ReactNode;
  /** Illustration centrale du panneau marque (masquée en mobile). */
  brand?: ReactNode;
  /** Début du dégradé du panneau marque : un NOM de jeton (`"primary-500"`, `"cat-ia"`). */
  accent?: string;
  /** Fin du dégradé : un nom de jeton. */
  accent2?: string;
  /** Cible de « Nous contacter » (WL24). */
  helpHref?: string;
};

// Gabarit des écrans d'authentification (SPEC-ECRANS-1 §2.2) : panneau marque + panneau formulaire.
// Sous 768 px, le panneau marque devient un bandeau en haut et le formulaire passe en pleine largeur.
export function WebShell({
  kicker,
  title,
  sub,
  step,
  total,
  progressLabel,
  children,
  cta,
  brand,
  accent = "primary-500",
  accent2 = "primary-700",
  helpHref = "/aide?sujet=question#contact",
}: WebShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface text-ink-900 md:flex-row">
      <header
        className="relative flex h-20 shrink-0 flex-col justify-center overflow-hidden px-4 text-white md:sticky md:top-0 md:h-dvh md:w-90 md:justify-between md:p-12 lg:w-120"
        style={{ backgroundImage: `linear-gradient(160deg, var(--${accent}) 0%, var(--${accent2}) 100%)` }}
      >
        {/* Décor */}
        <div aria-hidden>
          <span className="absolute -top-20 -right-15 size-55 rounded-full bg-white/8" />
          <span className="absolute -bottom-30 -left-10 size-70 rounded-full bg-white/6" />
          {DOTS.map((dot) => (
            <span key={dot.position} className={cx("absolute rounded-full", dot.position, dot.size, dot.tone)} />
          ))}
        </div>

        <div className="relative">
          <Link
            href="/"
            className="inline-block rounded-sm focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <Logo variant="white" height={32} alt="Steamy, accueil" eager />
          </Link>
        </div>

        {brand && (
          <div className="relative hidden flex-1 flex-col items-center justify-center gap-6 md:flex">{brand}</div>
        )}

        <p className="relative hidden text-xs font-bold text-white/90 md:block">
          La plateforme robotique &amp; STEM des jeunes d&apos;Afrique francophone.
        </p>
      </header>

      <main id="contenu" className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-ink-100 px-4 md:px-12">
          {step !== undefined && total !== undefined ? (
            <ProgressSteps step={step} total={total} label={progressLabel} className="max-w-70 min-w-0 flex-1" />
          ) : (
            <span />
          )}
          <p className="shrink-0 text-[13px] font-bold text-ink-600">
            <span className="hidden sm:inline">Besoin d&apos;aide ? </span>
            <Link
              href={helpHref}
              className="rounded-sm font-extrabold text-primary-600 underline-offset-2 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
            >
              Nous contacter
            </Link>
          </p>
        </div>

        <div className="flex flex-1 justify-center px-4 pt-8 pb-6 md:px-12 md:pt-12">
          <div className="flex w-full max-w-[460px] flex-col gap-7">
            <div>
              {kicker && (
                <p className="text-xs font-extrabold tracking-[0.06em] text-primary-600 uppercase">{kicker}</p>
              )}
              <h1 className="mt-2 text-[28px] leading-[1.1] font-black tracking-[-0.02em] md:text-4xl">{title}</h1>
              {sub && <p className="mt-3 text-base leading-normal font-semibold text-ink-600">{sub}</p>}
            </div>
            {children && <div className="flex flex-col gap-4">{children}</div>}
            {cta && <div className="flex flex-col gap-3">{cta}</div>}
          </div>
        </div>
      </main>
    </div>
  );
}

/** Alias du plan du lot 2 (`AuthLayout`). */
export const AuthLayout = WebShell;
