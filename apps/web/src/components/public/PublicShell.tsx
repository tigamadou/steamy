import { Suspense, type ReactNode } from "react";

import { PublicFooter } from "./PublicFooter";
import { CurrentPublicNav, PublicNav } from "./PublicNav";

/**
 * Gabarit des pages publiques : lien d'évitement, navigation, `<main id="contenu">`, pied de page.
 * Servi par `app/(public)/layout.tsx` et par la page 404.
 */
export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-surface text-ink-900">
      <a
        href="#contenu"
        className="sr-only z-50 rounded-md bg-primary-600 px-4 py-3 font-extrabold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Aller au contenu
      </a>
      <Suspense fallback={<PublicNav pathname={null} />}>
        <CurrentPublicNav />
      </Suspense>
      <main id="contenu" tabIndex={-1} className="flex flex-1 flex-col outline-none">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
