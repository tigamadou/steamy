import type { Metadata } from "next";
import { Suspense } from "react";

import { AddLearners, AddLearnersSkeleton } from "@/features/teacher/learners/AddLearners";

export const metadata: Metadata = { title: "Ajouter des élèves" };

/** WT06 · ajouter des élèves : individuel ou import par lot, classe présélectionnée par `?classe=`. */
export default function AddLearnersPage({ searchParams }: PageProps<"/enseignant/eleves/ajouter">) {
  return (
    <Suspense fallback={<AddLearnersSkeleton />}>
      <AddLearners searchParams={searchParams} />
    </Suspense>
  );
}
