"use client";

import type { ReactNode } from "react";

import { cx } from "@/lib/cx";

import { ChoiceGroup } from "../ChoiceCard/ChoiceGroup";

/** Réseau Mobile Money tel que servi par `GET referentials/payment-networks/?country=` (D76). */
export type PaymentNetworkOption = { code: string; label: string };

/** Initiales du réseau, sur la pastille de sa carte (« MTN » → « MT »). */
export function networkInitials(label: string): string {
  return label.replace(/[^\p{L}\p{N}]/gu, "").slice(0, 2).toUpperCase();
}

/** Contenu d'une carte de réseau : pastille et libellé (aucune couleur de marque codée en dur, D76). */
export function WANetworkCard({ label, checked, labelId }: { label: string; checked: boolean; labelId?: string }) {
  return (
    <>
      <span
        aria-hidden
        className={cx(
          "flex size-9.5 items-center justify-center rounded-pill text-[13px] font-black",
          checked ? "bg-primary-500 text-white" : "bg-ink-100 text-ink-700",
        )}
      >
        {networkInitials(label)}
      </span>
      <span id={labelId} className="text-[13px] font-extrabold text-ink-900">
        {label}
      </span>
    </>
  );
}

export type WANetworkCardGroupProps = {
  networks: readonly PaymentNetworkOption[];
  value?: string;
  onChange: (code: string) => void;
  legend?: ReactNode;
  name?: string;
  error?: ReactNode;
};

// WA03 · Réseaux Mobile Money actifs du pays, en cartes radio (flèches du clavier natives, carte entière cliquable).
export function WANetworkCardGroup({
  networks,
  value,
  onChange,
  legend = "Réseau Mobile Money",
  name = "reseau",
  error,
}: WANetworkCardGroupProps) {
  return (
    <ChoiceGroup
      legend={legend}
      name={name}
      required
      error={error}
      value={value ?? ""}
      onChange={onChange}
      options={networks.map((network) => ({ value: network.code, label: network.label }))}
      listClassName="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-3"
      optionClassName={(_, checked) =>
        cx(
          "flex min-h-11 flex-col items-center gap-2 rounded-2xl border-2 px-3 py-3.5",
          checked
            ? "border-primary-500 bg-primary-50 shadow-[0_4px_0_var(--primary-300)]"
            : "border-ink-200 bg-surface shadow-[0_4px_0_var(--ink-200)] hover:bg-ink-50",
        )
      }
      renderOption={(option, { checked, labelId }) => (
        <WANetworkCard label={option.label} checked={checked} labelId={labelId} />
      )}
    />
  );
}
