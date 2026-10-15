import Image from "next/image";

import { cx } from "@/lib/cx";

// Logos officiels (public/brand/, copiés de design/assets/). Jamais de filtre CSS sur le PNG coloré :
// son fond opaque donnerait un rectangle blanc. Sur fond foncé, la variante `white` charge l'asset blanc.
const ASSETS = {
  color: { src: "/brand/steamy_logo.png", width: 995, height: 263 },
  white: { src: "/brand/logo_landscape_white_tight.png", width: 5670, height: 1500 },
} as const;

export type LogoProps = {
  /** `white` sur fond foncé (pied de page, bandeaux). */
  variant?: keyof typeof ASSETS;
  /** Hauteur affichée en pixels ; la largeur suit le ratio du logo. */
  height?: number;
  alt?: string;
  /** Chargement immédiat : pour le logo visible au-dessus de la ligne de flottaison (en-tête). */
  eager?: boolean;
  className?: string;
};

export function Logo({ variant = "color", height = 40, alt = "Steamy", eager, className }: LogoProps) {
  const asset = ASSETS[variant];
  return (
    <Image
      src={asset.src}
      alt={alt}
      width={Math.round((height * asset.width) / asset.height)}
      height={height}
      loading={eager ? "eager" : undefined}
      className={cx("block h-auto max-w-full", className)}
    />
  );
}
