import Link from "next/link";

export type KitMiniCardProps = {
  name: string;
  /** Prix du kit lu dans la boutique, déjà mis en forme (D37 : jamais calculé par le front). */
  priceLabel: string;
  /** Disponibilité lue dans la boutique (le stock exact reste interne). */
  available: boolean;
  emoji?: string;
  /** Fiche du kit (WK02) ; sans cible livrée, la carte n'a pas de lien. */
  href?: string;
};

// Bloc « Kit requis » de WC05 (design/screens-catalog-web.jsx, `KitMiniCard`).
export function KitMiniCard({ name, priceLabel, available, emoji = "📦", href }: KitMiniCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-[14px] border border-amber-200 bg-amber-50 p-3">
      <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-md bg-surface text-[22px]">
        {emoji}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-extrabold text-ink-900">{name}</p>
        <p className="mt-0.5 text-xs font-bold text-ink-700">
          {priceLabel} · {available ? "En stock" : "En rupture de stock"}
        </p>
      </div>
      {href && (
        <Link
          href={href}
          aria-label={`Voir le kit ${name}`}
          className="shrink-0 rounded-[10px] border-[1.5px] border-amber-300 bg-surface px-2.5 py-1.5 text-xs font-extrabold text-ink-700 hover:bg-amber-50 focus-visible:outline-3 focus-visible:outline-primary-500"
        >
          Voir
        </Link>
      )}
    </div>
  );
}
