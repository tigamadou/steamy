import { LoadingState } from "@/components/states";

/**
 * WX03 : attente longue d'une page entière (loader et message rassurant). Les grilles affichent plutôt un
 * skeleton dans leur propre `<Suspense>`.
 */
export default function Loading() {
  return <LoadingState />;
}
