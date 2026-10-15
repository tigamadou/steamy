import type { CSSProperties, ReactNode } from "react";

import { Button } from "@/components/ds";
import { cx } from "@/lib/cx";
import { routes } from "@/lib/routes";

// Briques des pages publiques (design/screens-public-web.jsx) : en-tête de section, pilier, étape, bandeau.

export type WLSectionHeadProps = {
  kicker: string;
  title: ReactNode;
  className?: string;
};

/** Sur-titre et titre centrés d'une section. */
export function WLSectionHead({ kicker, title, className }: WLSectionHeadProps) {
  return (
    <div className={cx("text-center", className)}>
      <p className="text-xs font-extrabold tracking-[0.08em] text-primary-600 uppercase">{kicker}</p>
      <h2 className="mt-2 text-[26px] font-black tracking-[-0.01em] text-ink-900 sm:text-[32px]">{title}</h2>
    </div>
  );
}

export type WLPillarCardProps = {
  emoji: string;
  title: string;
  description: string;
  /** Couleur de la pastille : un token (`var(--cat-robotique)`). */
  color: string;
};

/** Carte « pilier » ou « valeur » (WL01, WL10). */
export function WLPillarCard({ emoji, title, description, color }: WLPillarCardProps) {
  return (
    <div className="flex flex-col gap-2.5 rounded-[20px] border-2 border-ink-100 bg-surface p-5.5">
      <span
        aria-hidden
        className="flex size-14 items-center justify-center rounded-lg bg-(--pillar) text-[28px]"
        style={{ "--pillar": color } as CSSProperties}
      >
        {emoji}
      </span>
      <h3 className="text-[17px] font-black text-ink-900">{title}</h3>
      <p className="text-sm leading-normal font-semibold text-ink-600">{description}</p>
    </div>
  );
}

export type WLStepProps = {
  n: number;
  title: string;
  description: string;
};

/** Étape numérotée de « Comment ça marche ». */
export function WLStep({ n, title, description }: WLStepProps) {
  return (
    <div className="flex flex-1 flex-col items-start gap-2.5">
      <span
        aria-hidden
        className="flex size-11 items-center justify-center rounded-[14px] bg-primary-500 text-xl font-black text-white shadow-[0_4px_0_var(--primary-700)]"
      >
        {n}
      </span>
      <h3 className="text-[17px] font-black text-ink-900">
        <span className="sr-only">Étape {n} : </span>
        {title}
      </h3>
      <p className="text-sm leading-normal font-semibold text-ink-600">{description}</p>
    </div>
  );
}

/** Bandeau de conversion (WL06, WL07, WL10, WL22) : chaque apprenant est rattaché à un parent. */
export function WLJoinBanner({ className }: { className?: string }) {
  return (
    <section
      aria-labelledby="rejoindre-titre"
      className={cx(
        "mt-8 flex flex-col items-start gap-6 rounded-[24px] bg-linear-135 from-primary-500 to-primary-700 px-6 py-8 text-white sm:px-10 md:flex-row md:items-center",
        className,
      )}
    >
      <div className="flex-1">
        <h2 id="rejoindre-titre" className="text-2xl font-black">
          Crée ton compte gratuit pour commencer
        </h2>
        <p className="mt-1.5 text-[15px] font-semibold text-white/90">
          Chaque apprenant est rattaché à un parent qui valide en 1 min. Paiement Mobile Money, sans carte bancaire.
        </p>
      </div>
      <Button variant="amber" size="lg" href={routes.signup()}>
        Créer un compte
      </Button>
    </section>
  );
}
