import { useId, type ReactNode } from "react";

import { cx } from "@/lib/cx";

export type SectionProps = {
  title: ReactNode;
  /** Niveau du titre (h2 par défaut ; le h1 est porté par le header du shell). */
  as?: "h2" | "h3";
  /** Ton du titre : `danger` pour la zone sensible. */
  tone?: "default" | "danger";
  /** Ancre de la section (`#notifications`), cible d'un lien d'un autre écran. */
  id?: string;
  className?: string;
  children: ReactNode;
};

// Section titrée d'une page de paramètres (ex-`WPDSection`, design/screens-parent-dashboard-web.jsx) : petit titre
// en capitales, puis une pile de cartes ou de lignes. Réutilisée par WD13, WPD08 et WT08.
export function Section({ title, as: Heading = "h2", tone = "default", id, className, children }: SectionProps) {
  const titleId = `section-${useId()}`;
  return (
    <section id={id} aria-labelledby={titleId} className={cx("flex flex-col gap-2", id && "scroll-mt-20", className)}>
      <Heading
        id={titleId}
        className={cx(
          "m-0 mb-1 text-[13px] font-black tracking-[0.06em] uppercase",
          tone === "danger" ? "text-error-600" : "text-ink-700",
        )}
      >
        {title}
      </Heading>
      {children}
    </section>
  );
}
