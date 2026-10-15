import type { Metadata } from "next";
import { Suspense } from "react";

import { FaqAccordion, Mascot, Tag } from "@/components/ds";
import { ContactForm } from "@/components/public/ContactForm";
import { FormSkeleton } from "@/components/public/form-sections";
import { FAQ } from "@/content/faq";
import { site } from "@/content/site";
import { routes } from "@/lib/routes";

const DESCRIPTION = "Les réponses aux questions les plus fréquentes. Vous ne trouvez pas ? Écrivez-nous.";

export const metadata: Metadata = {
  title: "Aide et contact",
  description: DESCRIPTION,
  alternates: { canonical: routes.help },
};

const WRAP = "mx-auto w-full max-w-[1120px] px-4 sm:px-8";

/** WL24 · Aide & contact (D17) : FAQ statique par thème (`#faq`) et formulaire de contact (`#contact`, `?sujet=`). */
export default function HelpPage() {
  return (
    <>
      <section className="border-b border-primary-100 bg-primary-50">
        <div className={`${WRAP} flex items-center gap-6 pt-9 pb-7.5`}>
          <div className="flex-1">
            <p className="text-xs font-black tracking-[0.08em] text-primary-600 uppercase">Centre d&apos;aide</p>
            <h1 className="mt-1.5 text-[30px] font-black text-ink-900 sm:text-4xl">Aide & contact</h1>
            <p className="mt-2 mb-4 max-w-[560px] text-base font-semibold text-ink-600">{DESCRIPTION}</p>
            <nav aria-label="Dans cette page">
              <ul className="flex flex-wrap gap-2">
                {FAQ.map((theme) => (
                  <li key={theme.id}>
                    <Tag href={`${routes.help}#${theme.id}`}>
                      <span aria-hidden>{theme.icon}</span> {theme.title}
                    </Tag>
                  </li>
                ))}
                <li>
                  <Tag href={routes.contact()}>
                    <span aria-hidden>✉️</span> Nous contacter
                  </Tag>
                </li>
              </ul>
            </nav>
          </div>
          <Mascot pose="wave" size={150} className="hidden sm:block" />
        </div>
      </section>

      <section id="faq" aria-labelledby="faq-titre" className={`${WRAP} scroll-mt-24 pt-8 pb-2`}>
        <h2 id="faq-titre" className="mb-5 text-2xl font-black text-ink-900">
          Questions fréquentes
        </h2>
        <FaqAccordion
          themes={FAQ}
          searchable
          searchLabel="Rechercher une question"
          emptyMessage="Aucune question ne correspond. Écrivez-nous avec le formulaire ci-dessous."
        />
      </section>

      <section
        id="contact"
        aria-label="Formulaire de contact"
        className={`${WRAP} grid scroll-mt-24 items-start gap-7 pt-7 pb-12 lg:grid-cols-[minmax(0,1fr)_320px]`}
      >
        <div className="rounded-[22px] border-2 border-ink-100 bg-surface p-6 shadow-pop-md sm:p-7">
          <Suspense fallback={<FormSkeleton label="Chargement du formulaire de contact…" />}>
            <ContactForm />
          </Suspense>
        </div>
        <aside aria-label="Avant d'écrire" className="flex flex-col gap-3">
          <div className="rounded-[22px] border-2 border-ink-100 bg-surface p-4.5">
            <h2 className="mb-2 text-[15px] font-black text-ink-900">Avant d&apos;écrire</h2>
            <ul className="flex flex-col gap-2 text-sm font-bold text-ink-700">
              <li className="flex gap-2.5">
                <span aria-hidden>🔑</span>
                Mot de passe oublié : un apprenant le fait réinitialiser par son parent ; un parent utilise « Mot de
                passe oublié ».
              </li>
              <li className="flex gap-2.5">
                <span aria-hidden>🧾</span>
                Pour un paiement, indiquez la référence de commande.
              </li>
            </ul>
          </div>
          <p className="flex gap-2.5 rounded-[14px] border-2 border-ink-100 bg-ink-50 px-3.5 py-3 text-[13px] font-bold text-ink-700">
            <span aria-hidden>📍</span>
            {site.address}
          </p>
        </aside>
      </section>
    </>
  );
}
