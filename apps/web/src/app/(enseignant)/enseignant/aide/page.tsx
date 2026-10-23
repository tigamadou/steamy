import type { Metadata } from "next";
import { Suspense } from "react";

import { FaqAccordion, SkeletonBlock } from "@/components/ds";
import { ContactForm } from "@/components/public/ContactForm";
import { TEACHER_FAQ } from "@/content/faq/teacher";

export const metadata: Metadata = { title: "Aide & support" };

/**
 * WT11 · aide de l'enseignant : FAQ statique versionnée (D10), recherche locale, et formulaire de contact de WL24
 * dans le shell. Le h1 est le titre du header (« Aide & support »).
 */
export default function TeacherHelpPage() {
  return (
    <div className="mx-auto flex w-full max-w-180 flex-col gap-8">
      <section aria-labelledby="faq-enseignant">
        <h2 id="faq-enseignant" className="m-0 mb-4 text-xl font-black text-ink-900">
          Questions fréquentes
        </h2>
        <FaqAccordion
          themes={TEACHER_FAQ}
          searchable
          searchLabel="Rechercher une question"
          searchPlaceholder="Classe, élève, invitation…"
          emptyMessage="Aucune question ne correspond. Écrivez-nous avec le formulaire ci-dessous."
        />
      </section>
      <section aria-label="Formulaire de contact" className="rounded-[18px] border-2 border-ink-100 bg-surface p-5 sm:p-6">
        {/* Le sujet présélectionné se lit dans l'URL (`?sujet=`) : lecture sous Suspense (cacheComponents) */}
        <Suspense fallback={<SkeletonBlock className="h-80 rounded-lg" />}>
          <ContactForm />
        </Suspense>
      </section>
    </div>
  );
}
