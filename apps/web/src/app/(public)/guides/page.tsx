import type { Metadata } from "next";

import { GuideCard } from "@/components/public/editorial";
import { GUIDES } from "@/content/guides";

const DESCRIPTION = "Des ressources PDF gratuites pour apprendre à ton rythme, à télécharger librement.";

export const metadata: Metadata = {
  title: "Guides gratuits",
  description: DESCRIPTION,
  alternates: { canonical: "/guides" },
};

/** WL20 · Guides gratuits : téléchargement libre, sans email (D14). */
export default function GuidesPage() {
  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 pt-10 pb-14 sm:px-8">
      <h1 className="text-[30px] font-black text-ink-900 sm:text-4xl">Guides gratuits</h1>
      <p className="mt-2.5 max-w-[560px] text-base leading-normal font-semibold text-ink-600">{DESCRIPTION}</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GUIDES.map((guide) => (
          <GuideCard key={guide.slug} guide={guide} />
        ))}
      </div>
    </div>
  );
}
