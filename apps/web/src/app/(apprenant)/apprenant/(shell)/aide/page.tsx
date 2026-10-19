import type { Metadata } from "next";

import { Button, FaqAccordion, Mascot } from "@/components/ds";
import { LEARNER_FAQ } from "@/content/faq/apprenant";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Aide & Support" };

/**
 * WD12 · aide de l'apprenant : FAQ statique versionnée (D10), recherche locale, accordéon, et « Contacter le
 * support » vers le formulaire de WL24. Le h1 est le titre du header du shell (« Aide & Support »).
 */
export default function LearnerHelpPage() {
  return (
    <div className="mx-auto flex w-full max-w-180 flex-col gap-8">
      <section aria-labelledby="faq-apprenant">
        <h2 id="faq-apprenant" className="m-0 mb-4 text-xl font-black text-ink-900">
          Questions fréquentes
        </h2>
        <FaqAccordion
          themes={LEARNER_FAQ}
          searchable
          searchLabel="Rechercher une question"
          searchPlaceholder="Kit Code, mot de passe…"
          emptyMessage="Aucune question ne correspond. Écris-nous avec le bouton ci-dessous."
        />
      </section>
      <section
        aria-labelledby="support"
        className="flex flex-col items-start gap-4 rounded-[18px] border-2 border-primary-100 bg-primary-50 p-5 sm:flex-row sm:items-center"
      >
        <div aria-hidden className="hidden sm:block">
          <Mascot pose="idle" size={80} />
        </div>
        <div className="flex-1">
          <h2 id="support" className="m-0 text-[15px] font-black text-ink-900">
            Tu ne trouves pas ta réponse ?
          </h2>
          <p className="m-0 text-[13px] font-semibold text-ink-600">Notre équipe te répond en français.</p>
        </div>
        <Button href={routes.contact()}>Contacter le support</Button>
      </section>
    </div>
  );
}
