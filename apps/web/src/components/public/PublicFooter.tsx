import Link from "next/link";

import { Logo } from "@/components/ds";
import { site } from "@/content/site";
import { routes } from "@/lib/routes";

import { WLSocial } from "./WLSocial";

// Colonnes et cibles du pied de page (D17, SPEC-ECRANS-1 §1.1).
const COLUMNS = [
  {
    title: "Produit",
    links: [
      { label: "Parcours", href: routes.courses },
      { label: "Boutique de kits", href: routes.shop },
      { label: "Steamy Events", href: routes.events },
      { label: "Tarifs", href: routes.schools },
    ],
  },
  {
    title: "Aide",
    links: [
      { label: "Centre d'aide", href: routes.faq },
      { label: "Nous contacter", href: routes.contact() },
      { label: "Consentement parent", href: routes.parentalConsent },
    ],
  },
  {
    title: "Légal",
    links: [
      { label: "CGU", href: routes.legal("cgu") },
      { label: "Mentions légales", href: routes.legal("mentions-legales") },
      { label: "Confidentialité", href: routes.legal("confidentialite") },
    ],
  },
];

/** Pied de page public (`WLFooter`) : fond `--ink-900`, 4 colonnes, réseaux sociaux. */
export function PublicFooter() {
  return (
    <footer className="bg-ink-900 text-white">
      <div className="mx-auto grid max-w-[1120px] gap-8 px-4 pt-12 pb-8 sm:grid-cols-2 sm:px-8 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo variant="white" height={34} />
          <p className="mt-3.5 max-w-[260px] text-[13px] leading-relaxed font-semibold text-white/75">{site.mission}</p>
        </div>
        {COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h2 className="mb-3 text-[13px] font-black">{column.title}</h2>
            <ul className="flex flex-col gap-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="rounded-sm text-[13px] font-semibold text-white/75 hover:text-white focus-visible:outline-3 focus-visible:outline-primary-300"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-3 px-4 py-4.5 sm:px-8">
          <p className="text-xs font-semibold text-white/70">{site.copyright}</p>
          <WLSocial />
        </div>
      </div>
    </footer>
  );
}
