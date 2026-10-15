import { Suspense } from "react";

import { Badge, Button, Mascot } from "@/components/ds";
import { WLPillarCard, WLSectionHead, WLStep } from "@/components/public";
import { CourseGridSkeleton } from "@/components/public/catalog";
import { HomeCourses } from "@/components/public/catalog-sections";
import { AppStateBoundary } from "@/components/states";
import { homeStats } from "@/content/site";
import { routes } from "@/lib/routes";

const PILLARS = [
  {
    emoji: "🤖",
    title: "Parcours guidés",
    description: "Robotique, code, IA, électronique : projet par projet, à ton rythme.",
    color: "var(--cat-robotique)",
  },
  {
    emoji: "📦",
    title: "Kits physiques",
    description: "Reçois ton kit à la maison et construis pour de vrai.",
    color: "var(--cat-electronique)",
  },
  {
    emoji: "🏆",
    title: "Badges & certif",
    description: "Gagne des badges et décroche ta certification PDF.",
    color: "var(--amber-500)",
  },
  {
    emoji: "👨‍👩‍👧",
    title: "Suivi parent",
    description: "Tes parents suivent tes progrès et valident en sécurité.",
    color: "var(--cat-ia)",
  },
];

const STEPS = [
  {
    title: "Crée ton compte",
    description: "Inscris-toi gratuitement : ton compte est rattaché à un parent qui valide en 1 min.",
  },
  {
    title: "Explore le catalogue",
    description: "Parcours le catalogue et choisis le parcours qui te convient le mieux.",
  },
  { title: "Paie & commence", description: "Ton parent paie par Mobile Money et tu démarres sans attendre." },
];

const WRAP = "mx-auto w-full max-w-[1120px] px-4 sm:px-8";

/** WL01 · Accueil : hero, chiffres, piliers, parcours populaires, « Comment ça marche », boutique, parents. */
export default function HomePage() {
  const [learners] = homeStats;
  return (
    <>
      <section className="relative overflow-hidden bg-linear-180 from-primary-50 to-surface">
        <span aria-hidden className="absolute top-[18%] left-[6%] size-3 rounded-pill bg-amber-400" />
        <span aria-hidden className="absolute top-[10%] left-[46%] size-2 rounded-pill bg-primary-300" />
        <span aria-hidden className="absolute top-[60%] left-[90%] size-3.5 rounded-pill bg-(--cat-ia)" />
        <div className={`${WRAP} grid items-center gap-10 py-14 md:grid-cols-[1.1fr_0.9fr] md:pb-16`}>
          <div>
            <Badge tone="primary">🚀 Plateforme STEM des 10–17 ans</Badge>
            <h1 className="mt-4 text-[38px] leading-[1.05] font-black tracking-[-0.02em] text-ink-900 sm:text-[52px]">
              Apprends à construire les <span className="text-primary-600">robots</span> de demain.
            </h1>
            <p className="mt-4 max-w-[480px] text-lg leading-normal font-semibold text-ink-600">
              La robotique, le code et l&apos;IA <strong className="text-ink-800">par la pratique</strong> : kits livrés
              chez toi, Steamy Events et badges à la clé.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button size="lg" href={routes.signup()}>
                Créer un compte gratuit
              </Button>
              <Button size="lg" variant="outline" href={routes.howItWorks} iconRight="play">
                Comment ça marche
              </Button>
            </div>
            <div className="mt-6 flex items-center gap-3">
              <div aria-hidden className="flex">
                {["🦊", "🐼", "🦉", "🐯"].map((emoji, index) => (
                  <span
                    key={emoji}
                    className={`flex size-9 items-center justify-center rounded-pill border-2 border-surface bg-surface text-lg shadow-[0_0_0_1px_var(--ink-200)] ${index > 0 ? "-ml-2.5" : ""}`}
                  >
                    {emoji}
                  </span>
                ))}
              </div>
              <p className="text-[13px] font-bold text-ink-600">
                <strong className="text-ink-900">{learners.value}</strong> apprenants au Bénin et alentours
              </p>
            </div>
          </div>
          <div className="flex justify-center">
            <Mascot pose="cheer" size={300} className="w-48 h-auto sm:w-64 md:w-75" />
          </div>
        </div>
      </section>

      <section aria-label="Steamy en chiffres" className="bg-ink-900 text-white">
        <dl className={`${WRAP} grid grid-cols-2 gap-6 py-9 text-center md:grid-cols-4`}>
          {homeStats.map((stat) => (
            <div key={stat.label} className="flex flex-col-reverse">
              <dt className="text-[13px] font-bold text-white/75">{stat.label}</dt>
              <dd className="text-4xl font-black">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={`${WRAP} py-14`}>
        <WLSectionHead kicker="Pourquoi Steamy" title="Tout pour apprendre en faisant" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((pillar) => (
            <WLPillarCard key={pillar.title} {...pillar} />
          ))}
        </div>
      </section>

      <section className="bg-bg">
        <div className={`${WRAP} py-14`}>
          <WLSectionHead kicker="Catalogue" title="Parcours populaires" />
          <div className="mt-6">
            <AppStateBoundary>
              <Suspense fallback={<CourseGridSkeleton />}>
                <HomeCourses />
              </Suspense>
            </AppStateBoundary>
          </div>
          <div className="mt-6 text-center">
            <Button variant="outline" size="lg" href={routes.courses}>
              Explorer tout le catalogue
            </Button>
          </div>
        </div>
      </section>

      <section id="comment-ca-marche" className={`${WRAP} scroll-mt-20 py-14`}>
        <WLSectionHead kicker="En 3 étapes" title="Comment ça marche" />
        <ol className="mt-6 flex flex-col gap-8 md:flex-row">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex flex-1">
              <WLStep n={index + 1} {...step} />
            </li>
          ))}
        </ol>
      </section>

      <section className={`${WRAP} pb-14`}>
        <div className="flex flex-col items-start gap-8 rounded-[24px] bg-info-700 p-8 text-white sm:p-10 md:flex-row md:items-center">
          <div className="flex-1">
            <Badge solid>🛒 Boutique</Badge>
            <h2 className="mt-3.5 mb-2 text-[26px] font-black sm:text-[30px]">Des kits robotiques livrés chez toi</h2>
            <p className="max-w-[520px] text-base leading-normal font-semibold text-white/90">
              Châssis, capteurs, cartes… tout le matériel pour construire pour de vrai, payé en Mobile Money.
            </p>
            <div className="mt-5">
              <Button variant="amber" size="lg" href={routes.shop}>
                Voir la boutique
              </Button>
            </div>
          </div>
          <p aria-hidden className="text-6xl sm:text-7xl">
            🤖⚡🦾
          </p>
        </div>
      </section>

      <section className="bg-bg">
        <div className={`${WRAP} grid items-center gap-10 py-14 md:grid-cols-[0.9fr_1.1fr]`}>
          <div className="flex justify-center">
            <Mascot pose="idle" size={220} className="w-40 h-auto sm:w-55" />
          </div>
          <div>
            <Badge tone="primary">👨‍👩‍👧 Espace parent</Badge>
            <h2 className="mt-3.5 mb-2 text-[26px] font-black text-ink-900 sm:text-[30px]">
              Vos enfants apprennent en sécurité
            </h2>
            <p className="max-w-[520px] text-base leading-normal font-semibold text-ink-600">
              Vous validez chaque inscription et chaque paiement, suivez la progression et gérez plusieurs enfants, sans
              carte bancaire, uniquement en Mobile Money.
            </p>
            <div className="mt-5">
              <Button size="lg" variant="outline" href={routes.parentSignup}>
                Créer un compte parent
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className={`${WRAP} py-14`}>
        <div className="flex flex-col items-start gap-6 rounded-[24px] border-2 border-ink-100 bg-surface px-6 py-8 sm:px-10 md:flex-row md:items-center">
          <span
            aria-hidden
            className="flex size-16 shrink-0 items-center justify-center rounded-[18px] bg-amber-100 text-[32px]"
          >
            🎓
          </span>
          <div className="flex-1">
            <h2 className="text-[22px] font-black text-ink-900">Devenir instructeur</h2>
            <p className="mt-1.5 text-[15px] leading-normal font-semibold text-ink-600">
              Partagez vos connaissances et accompagnez la prochaine génération d&apos;inventeurs.
            </p>
          </div>
          <Button variant="outline" size="lg" href={routes.contact("candidature")}>
            Rejoindre l&apos;équipe
          </Button>
        </div>
      </section>

      <section className={`${WRAP} pb-16`}>
        <div className="flex flex-col items-center rounded-[28px] bg-linear-135 from-primary-500 to-primary-700 px-6 py-12 text-center text-white">
          <Mascot pose="wave" size={120} hue="var(--surface)" />
          <h2 className="mt-3 mb-2 text-[28px] font-black sm:text-4xl">Prêt·e à devenir inventeur·e ?</h2>
          <p className="text-[17px] font-semibold text-white/90">
            Rejoins Steamy gratuitement et commence ton premier parcours aujourd&apos;hui.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button size="lg" variant="amber" href={routes.signup()}>
              Créer un compte gratuit
            </Button>
            <Button size="lg" variant="outline-inverse" href={routes.login()}>
              J&apos;ai déjà un compte
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
