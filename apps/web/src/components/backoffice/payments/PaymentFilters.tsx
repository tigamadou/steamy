import type { Schemas } from "@steamy/api-client";
import type { ReactNode } from "react";

import { Button } from "@/components/ds/Button";
import { ORDER_KIND, PAYMENT_STATUS, type PaymentFilters as Filters } from "@/lib/backoffice/payments";
import { cx } from "@/lib/cx";
import { routes } from "@/lib/routes";

import { FOCUS } from "../styles";

const CONTROL = cx(
  "w-full rounded-[10px] border-[1.5px] border-ink-200 bg-surface px-3 py-2 text-[13px] font-semibold text-ink-900",
  FOCUS,
);

export type PaymentFiltersProps = {
  filters: Filters;
  countries: Pick<Schemas["Country"], "code" | "label">[];
  networks: Pick<Schemas["PaymentNetwork"], "code" | "label">[];
};

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-36 flex-1 flex-col gap-1">
      <label htmlFor={id} className="text-[11px] font-extrabold tracking-[.05em] text-ink-600 uppercase">
        {label}
      </label>
      {children}
    </div>
  );
}

/** Filtres en `<form method="get">` rendu par le serveur : l'URL les porte, rechargement et partage conservent la vue. */
export function PaymentFilters({ filters, countries, networks }: PaymentFiltersProps) {
  // Un réseau existe parfois dans plusieurs pays (même code) : une seule entrée par code
  const uniqueNetworks = [...new Map(networks.map((network) => [network.code, network])).values()];
  return (
    <form method="get" action={routes.backoffice.payments} aria-label="Filtres des paiements" className="mb-4 flex flex-wrap items-end gap-3">
      <Field id="filtre-q" label="Référence ou identifiant">
        <input id="filtre-q" name="q" type="search" defaultValue={filters.q ?? ""} autoComplete="off" className={CONTROL} />
      </Field>
      <Field id="filtre-statut" label="Statut">
        <select id="filtre-statut" name="statut" defaultValue={filters.status ?? ""} className={CONTROL}>
          <option value="">Tous</option>
          {Object.entries(PAYMENT_STATUS).map(([code, { label }]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <Field id="filtre-reseau" label="Réseau">
        <select id="filtre-reseau" name="reseau" defaultValue={filters.network ?? ""} className={CONTROL}>
          <option value="">Tous</option>
          {uniqueNetworks.map((network) => (
            <option key={network.code} value={network.code}>
              {network.label}
            </option>
          ))}
        </select>
      </Field>
      <Field id="filtre-pays" label="Pays">
        <select id="filtre-pays" name="pays" defaultValue={filters.country ?? ""} className={CONTROL}>
          <option value="">Tous</option>
          {countries.map((country) => (
            <option key={country.code} value={country.code}>
              {country.label}
            </option>
          ))}
        </select>
      </Field>
      <Field id="filtre-type" label="Type">
        <select id="filtre-type" name="type" defaultValue={filters.kind ?? ""} className={CONTROL}>
          <option value="">Tous</option>
          {Object.entries(ORDER_KIND).map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <Field id="filtre-du" label="Du">
        <input id="filtre-du" name="du" type="date" defaultValue={filters.from ?? ""} className={CONTROL} />
      </Field>
      <Field id="filtre-au" label="Au">
        <input id="filtre-au" name="au" type="date" defaultValue={filters.to ?? ""} className={CONTROL} />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" variant="ink" size="sm">
          Filtrer
        </Button>
        <Button href={routes.backoffice.payments} variant="ink-outline" size="sm">
          Réinitialiser
        </Button>
      </div>
    </form>
  );
}
