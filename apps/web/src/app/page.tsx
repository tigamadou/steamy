import Image from "next/image";

// Accueil provisoire : la page d'accueil publique (WL01) la remplace à l'étape 1.1 du lot 1.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <Image src="/brand/steamy_logo.png" alt="Steamy" width={240} height={63} loading="eager" />
      <h1 className="text-3xl font-extrabold text-ink-900">Nous formons les inventeurs de demain</h1>
      <p className="text-ink-600">Le site arrive bientôt.</p>
    </main>
  );
}
