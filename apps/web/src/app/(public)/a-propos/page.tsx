import type { Metadata } from "next";

import { Avatar, Badge } from "@/components/ds";
import { WLJoinBanner, WLPillarCard, WLSectionHead } from "@/components/public";
import { about, stats } from "@/content/site";

export const metadata: Metadata = {
  title: "À propos",
  description: about.lead,
  alternates: { canonical: "/a-propos" },
};

/** WL10 · À propos : mission, chiffres, valeurs, équipe (adultes uniquement, D15). */
export default function AboutPage() {
  return (
    <>
      <section className="bg-linear-180 from-primary-50 to-surface">
        <div className="mx-auto max-w-[1120px] px-4 py-14 text-center sm:px-8">
          <Badge tone="primary">{about.kicker}</Badge>
          <h1 className="mt-3.5 text-[34px] leading-[1.1] font-black text-ink-900 sm:text-[46px]">
            Former les <span className="text-primary-600">inventeurs</span> de demain
          </h1>
          <p className="mx-auto mt-4 max-w-[620px] text-lg leading-normal font-semibold text-ink-600">{about.lead}</p>
        </div>
      </section>
      <section aria-label="Steamy en chiffres" className="bg-ink-900 text-white">
        <dl className="mx-auto grid max-w-[1120px] grid-cols-2 gap-6 px-4 py-9 text-center sm:px-8 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col-reverse">
              <dt className="text-[13px] font-bold text-white/75">{stat.label}</dt>
              <dd className="text-[34px] font-black">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="mx-auto w-full max-w-[1120px] px-4 py-14 sm:px-8">
        <WLSectionHead kicker="Nos valeurs" title="Ce qui nous fait avancer" />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {about.values.map((value) => (
            <WLPillarCard key={value.title} {...value} />
          ))}
        </div>
      </section>
      <section className="bg-bg">
        <div className="mx-auto max-w-[1120px] px-4 py-14 sm:px-8">
          <WLSectionHead kicker="L'équipe" title="Des passionnés de STEM" />
          <ul className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {about.team.map((member) => (
              <li
                key={member.name}
                className="flex flex-col items-center rounded-[18px] border-[1.5px] border-ink-100 bg-surface p-5 text-center"
              >
                <Avatar name={member.name} emoji={member.emoji} color={member.color} size={72} ring decorative />
                <p className="mt-3 text-[15px] font-black text-ink-900">{member.name}</p>
                <p className="text-[13px] font-bold text-ink-600">{member.role}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <div className="mx-auto w-full max-w-[1120px] px-4 pb-14 sm:px-8">
        <WLJoinBanner />
      </div>
    </>
  );
}
