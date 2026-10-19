import type { Metadata } from "next";
import { Suspense } from "react";

import { ContentSkeleton } from "@/features/learning/ContentSkeleton";
import { CertificationView } from "@/features/learning/certification/CertificationView";

export const metadata: Metadata = { title: "Certification" };

// WJ07 / WJ09 · Certification du parcours, ou ce qu'il reste à faire pour l'obtenir.
export default async function CertificationPage({ params }: PageProps<"/apprenant/parcours/[slug]/certification">) {
  const { slug } = await params;
  return (
    <Suspense fallback={<ContentSkeleton />}>
      <CertificationView slug={slug} />
    </Suspense>
  );
}
