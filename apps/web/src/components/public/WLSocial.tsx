import { site, type SocialNetwork } from "@/content/site";
import { cx } from "@/lib/cx";

// Icônes monochromes de public/brand/ appliquées en masque : leur couleur suit le texte (aucun filtre CSS).
const MASKS: Record<SocialNetwork, string> = {
  instagram: "[mask:url(/brand/insta.svg)_center/contain_no-repeat]",
  x: "[mask:url(/brand/x.svg)_center/contain_no-repeat]",
  linkedin: "[mask:url(/brand/linkedin.svg)_center/contain_no-repeat]",
};

export type WLSocialProps = {
  /** Fond clair (icônes sombres) ; par défaut fond foncé (icônes blanches). */
  light?: boolean;
  /** Liens de partage d'une page (WL18) à la place des comptes de Steamy. */
  links?: ReadonlyArray<{ network: SocialNetwork; label: string; href: string }>;
  className?: string;
};

/** Liens vers les réseaux sociaux, ouverts dans un nouvel onglet. */
export function WLSocial({ light, links = site.social, className }: WLSocialProps) {
  return (
    <ul className={cx("flex items-center gap-1", className)}>
      {links.map((link) => (
        <li key={link.network}>
          <a
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${link.label} (nouvel onglet)`}
            className={cx(
              "flex size-9 items-center justify-center rounded-md focus-visible:outline-3 focus-visible:outline-primary-300",
              light ? "text-ink-600 hover:text-ink-900" : "text-white/85 hover:text-white",
            )}
          >
            <span aria-hidden className={cx("block size-4.5 bg-current", MASKS[link.network])} />
          </a>
        </li>
      ))}
    </ul>
  );
}
