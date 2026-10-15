import type { Metadata } from "next";

import { GuideCard } from "@/components/public/editorial";
import { NewsletterForm } from "@/components/public/NewsletterForm";
import { GUIDES } from "@/content/guides";

const DESCRIPTION = "Des ressources PDF gratuites pour apprendre à ton rythme, à télécharger librement.";

export const metadata: Metadata = {
  title: "Guides gratuits",
  description: DESCRIPTION,
  alternates: { canonical: "/guides" },
};

/** WL20 · Guides gratuits : téléchargement libre, sans email (D14), et encart newsletter facultatif (adultes, C12). */
export default function GuidesPage() {
  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 pt-10 pb-14 sm:px-8">
      <h1 className="text-[30px] font-black text-ink-900 sm:text-4xl">Guides gratuits</h1>
      <p className="mt-2.5 max-w-[560px] text-base leading-normal font-semibold text-ink-600">{DESCRIPTION}</p>
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {GUIDES.map((guide) => (
            <GuideCard key={guide.slug} guide={guide} />
          ))}
        </div>
        <aside
          aria-labelledby="newsletter-titre"
          className="flex flex-col gap-3.5 rounded-[22px] border-2 border-primary-100 bg-primary-50 p-6 lg:sticky lg:top-24"
        >
          <span aria-hidden className="text-[30px]">
            📥
          </span>
          <h2 id="newsletter-titre" className="text-lg font-black text-ink-900">
            Recevez nos nouveaux guides
          </h2>
          <p className="text-[13px] leading-normal font-semibold text-ink-600">
            Pour les parents et les enseignants : un email à chaque nouveau guide. Facultatif, les guides restent en
            téléchargement libre.
          </p>
          <NewsletterForm />
        </aside>
      </div>
    </div>
  );
}
