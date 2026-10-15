import { Mascot } from "@/components/ds";

// Accueil provisoire, dans le shell public : la page d'accueil (WL01) la remplace à l'étape 1.1 du lot 1.
export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <Mascot pose="wave" size={140} />
      <h1 className="text-3xl font-extrabold text-ink-900">Nous formons les inventeurs de demain</h1>
      <p className="font-semibold text-ink-600">Le site arrive bientôt.</p>
    </div>
  );
}
