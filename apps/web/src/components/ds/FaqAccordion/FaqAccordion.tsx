"use client";

import { useId, useState } from "react";

import { cx } from "@/lib/cx";

import { Accordion } from "../Accordion";
import { Input } from "../Input";

export type FaqItem = {
  question: string;
  answer: string;
};

export type FaqTheme = {
  title: string;
  items: FaqItem[];
};

export type FaqAccordionProps = {
  /** FAQ statique (contenu éditorial versionné, D10), regroupée par thème. */
  themes: FaqTheme[];
  /** Affiche un champ de recherche locale (filtre questions et réponses). */
  searchable?: boolean;
  searchLabel?: string;
  searchPlaceholder?: string;
  /** Message quand la recherche ne trouve rien (registre de l'espace : tu ou vous). */
  emptyMessage?: string;
  className?: string;
};

/** Minuscules sans accents, pour une recherche tolérante. */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export function filterFaq(themes: FaqTheme[], query: string): FaqTheme[] {
  const needle = normalize(query.trim());
  if (!needle) return themes;
  return themes
    .map((theme) => ({
      ...theme,
      items: theme.items.filter((item) => normalize(`${item.question} ${item.answer}`).includes(needle)),
    }))
    .filter((theme) => theme.items.length > 0);
}

// FAQ par thème (WL24, puis WD12, WPD13, WT11).
export function FaqAccordion({
  themes,
  searchable,
  searchLabel = "Rechercher dans la FAQ",
  searchPlaceholder,
  emptyMessage = "Aucune question ne correspond à cette recherche.",
  className,
}: FaqAccordionProps) {
  const [query, setQuery] = useState("");
  const searchId = useId();
  const results = filterFaq(themes, query);
  const searching = query.trim().length > 0;

  return (
    <div className={cx("flex flex-col gap-8", className)}>
      {searchable && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={searchId} className="text-sm font-bold text-ink-700">
            {searchLabel}
          </label>
          <Input
            id={searchId}
            type="search"
            icon="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
          />
        </div>
      )}
      <div aria-live="polite" className="flex flex-col gap-8">
        {results.length === 0 ? (
          <p className="font-semibold text-ink-600">{emptyMessage}</p>
        ) : (
          results.map((theme) => (
            <section key={theme.title} className="flex flex-col gap-3">
              <h3 className="text-lg font-black text-ink-900">{theme.title}</h3>
              {theme.items.map((item) => (
                <Accordion key={item.question} title={item.question} open={searching || undefined}>
                  <p>{item.answer}</p>
                </Accordion>
              ))}
            </section>
          ))
        )}
      </div>
    </div>
  );
}
