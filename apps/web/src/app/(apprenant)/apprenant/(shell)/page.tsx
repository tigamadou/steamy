import { Mascot } from "@/components/ds/Mascot";

// Accueil provisoire dans le shell (3.0), remplacé par le tableau de bord WD01/WD02 à l'étape 3.1.
export default function ApprenantHome() {
  return (
    <section className="mx-auto flex max-w-md flex-col items-center gap-4 py-12 text-center">
      <Mascot pose="wave" size={140} />
      <p className="m-0 text-base font-semibold text-ink-600">
        Ton tableau de bord se prépare. En attendant, explore ton espace avec le menu.
      </p>
    </section>
  );
}
