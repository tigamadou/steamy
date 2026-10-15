import type { Metadata } from "next";
import { Suspense } from "react";

import { Badge, Button, Icon, Mascot } from "@/components/ds";
import { WLSectionHead } from "@/components/public";
import { FormSkeleton, QuoteSection } from "@/components/public/form-sections";
import { AppStateBoundary } from "@/components/states";
import { schoolOffers } from "@/content/site";
import { cx } from "@/lib/cx";
import { routes } from "@/lib/routes";

const DESCRIPTION =
  "Parcours clés en main, kits, formation des formateurs et suivi des élèves, adaptés au programme et au contexte local.";

export const metadata: Metadata = {
  title: "Écoles",
  description: DESCRIPTION,
  alternates: { canonical: routes.schools },
};

const TRAINER_FEATURES = [
  "Gestion de classes et import d'élèves par lot",
  "Suivi des évaluations formatives et sommatives",
  "Commentaires aux élèves et aux parents",
  "Rapports d'activité hebdomadaires",
];

const WRAP = "mx-auto w-full max-w-[1120px] px-4 sm:px-8";

/** WL11 · Écoles (B2B, vouvoiement) : tous les CTA mènent au formulaire de devis, offre présélectionnée (D13). */
export default function SchoolsPage() {
  return (
    <>
      <section className="bg-linear-135 from-primary-600 to-primary-800 text-white">
        <div className={`${WRAP} grid items-center gap-8 py-14 md:grid-cols-[1.2fr_0.8fr]`}>
          <div>
            <Badge solid>🏫 Pour les écoles</Badge>
            <h1 className="mt-3.5 mb-2 text-[34px] leading-[1.1] font-black sm:text-[44px]">
              Amenez la robotique dans vos classes
            </h1>
            <p className="max-w-[520px] text-[17px] leading-normal font-semibold text-white/90">{DESCRIPTION}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="amber" size="lg" href={routes.quote()}>
                Demander un devis
              </Button>
            </div>
          </div>
          <div className="flex justify-center">
            <Mascot pose="focus" size={200} hue="var(--surface)" className="h-auto w-36 sm:w-50" />
          </div>
        </div>
      </section>

      <section className={`${WRAP} py-14`}>
        <WLSectionHead kicker="Nos offres" title="Une formule pour chaque établissement" />
        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          {schoolOffers.map((offer) => (
            <li
              key={offer.slug}
              className={cx(
                "flex flex-col gap-3 rounded-[22px] border-2 bg-surface p-6",
                offer.featured ? "border-primary-500 shadow-card-hover" : "border-ink-100",
              )}
            >
              {offer.featured && (
                <Badge solid className="self-start">
                  Le plus choisi
                </Badge>
              )}
              <h3 className="text-lg font-black text-ink-900">{offer.name}</h3>
              <p>
                <span className="text-[28px] font-black text-primary-700">{offer.price}</span>{" "}
                <span className="text-[13px] font-bold text-ink-600">{offer.unit}</span>
              </p>
              <ul className="flex flex-col gap-2">
                {offer.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm font-semibold text-ink-700">
                    <Icon name="check" size={16} strokeWidth={3} className="text-success-700" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                block
                className="mt-auto"
                variant={offer.featured ? "primary" : "outline"}
                href={routes.quote(offer.slug)}
                aria-label={`Choisir l'offre ${offer.name}`}
              >
                Choisir
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-bg">
        <div className={`${WRAP} grid items-start gap-8 py-14 md:grid-cols-2`}>
          <div>
            <WLSectionHead kicker="Pourquoi Steamy" title="Pensé pour les formateurs" className="md:text-left" />
            <ul className="mt-5 flex flex-col gap-2.5">
              {TRAINER_FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-2.5 text-[15px] font-bold text-ink-700">
                  <Icon name="check" size={18} strokeWidth={3} className="text-success-700" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
          <div id="devis" className="scroll-mt-24 rounded-[22px] border-2 border-ink-100 bg-surface p-6">
            <AppStateBoundary register="vous">
              <Suspense fallback={<FormSkeleton label="Chargement du formulaire de devis…" />}>
                <QuoteSection />
              </Suspense>
            </AppStateBoundary>
          </div>
        </div>
      </section>
    </>
  );
}
