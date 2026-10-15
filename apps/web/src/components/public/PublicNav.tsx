"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/ds";
import { cx } from "@/lib/cx";
import { routes, sectionOf } from "@/lib/routes";

import { MegaMenu } from "./MegaMenu";
import { MobileMenu } from "./MobileMenu";
import { ABOUT_LINK, currentOf, MAIN_LINKS, RESOURCE_LINKS } from "./nav";
import { NavAccount } from "./NavAccount";

export type PublicNavProps = {
  /** Chemin courant ; `null` pendant le prérendu d'une route dynamique (aucun onglet actif). */
  pathname: string | null;
};

const tabClass = (active: boolean) =>
  cx(
    "whitespace-nowrap rounded-sm text-sm font-extrabold focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-primary-500",
    active ? "text-primary-600" : "text-ink-700 hover:text-ink-900",
  );

/** En-tête des pages publiques (`WLNavBar`) : collant, fond flouté ; tiroir sous 1024 px. */
export function PublicNav({ pathname }: PublicNavProps) {
  const section = pathname === null ? null : sectionOf(pathname);
  return (
    <header className="sticky top-0 z-20 border-b border-ink-100 bg-surface/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1120px] items-center gap-4.5 px-4 py-3 sm:px-8">
        <Link
          href={routes.home}
          className="shrink-0 rounded-sm focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-primary-500"
        >
          <Logo height={32} eager alt="Steamy, accueil" />
        </Link>
        <nav aria-label="Navigation principale" className="ml-2 hidden lg:block">
          <ul className="flex items-center gap-4">
            {MAIN_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={currentOf(link.href, pathname, link.section === section)}
                  className={tabClass(link.section === section)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <MegaMenu
                label="Ressources"
                items={RESOURCE_LINKS}
                active={section === "resources"}
                pathname={pathname}
              />
            </li>
            <li>
              <Link
                href={ABOUT_LINK.href}
                aria-current={currentOf(ABOUT_LINK.href, pathname, section === "about")}
                className={tabClass(section === "about")}
              >
                {ABOUT_LINK.label}
              </Link>
            </li>
          </ul>
        </nav>
        <div className="flex-1" />
        <div className="hidden lg:block">
          <NavAccount />
        </div>
        <div className="lg:hidden">
          <MobileMenu section={section} pathname={pathname} />
        </div>
      </div>
    </header>
  );
}

/**
 * Navigation avec l'onglet actif lu dans l'URL. À placer sous `<Suspense>` (fallback : `PublicNav` sans chemin) :
 * `usePathname()` suspend au prérendu des routes dont le paramètre n'est connu qu'à la requête.
 */
export function CurrentPublicNav() {
  return <PublicNav pathname={usePathname()} />;
}
