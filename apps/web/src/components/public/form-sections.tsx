import { connection } from "next/server";

import { SkeletonBlock } from "@/components/ds";
import { getCountries } from "@/lib/referentials";

import { QuoteForm } from "./QuoteForm";

/** Formulaire de devis avec les pays du `PhoneInput`, lus à la requête (référentiel en cache). */
export async function QuoteSection() {
  await connection();
  return <QuoteForm countries={await getCountries()} />;
}

/** Silhouette d'un formulaire pendant le chargement. */
export function FormSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className="flex flex-col gap-3.5">
      <SkeletonBlock className="h-6 w-48" />
      {Array.from({ length: 4 }, (_, i) => (
        <SkeletonBlock key={i} className="h-14 rounded-lg" />
      ))}
      <SkeletonBlock className="h-14 rounded-[18px]" />
    </div>
  );
}
