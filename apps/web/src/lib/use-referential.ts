"use client";

import type { Schemas } from "@steamy/api-client";
import { useCallback, useEffect, useState } from "react";

import { getBrowserApi } from "@/lib/api-browser";

/** Référentiels servis par `GET referentials/<nom>/` (D3) : aucune liste de ce type n'est codée en dur dans le front. */
export type Referentials = {
  avatars: Schemas["Avatar"];
  countries: Schemas["Country"];
  disabilities: Schemas["Disability"];
  goals: Schemas["Goal"];
  localities: Schemas["Locality"];
  "refusal-reasons": Schemas["RefusalReason"];
  relationships: Schemas["Relationship"];
  "school-grades": Schemas["SchoolGrade"];
};

export type ReferentialName = keyof Referentials;
export type ReferentialStatus = "idle" | "loading" | "error" | "ready";

// Un référentiel change rarement : une seule requête par page et par clé, rejouée après un échec.
const requests = new Map<string, Promise<unknown[]>>();

function keyOf(name: ReferentialName, country?: string): string {
  return country ? `${name}?country=${country}` : name;
}

async function load(name: ReferentialName, country?: string): Promise<unknown[]> {
  const api = await getBrowserApi();
  // Chemin calculé : le client typé n'accepte que des littéraux, d'où cette signature élargie.
  const get = api.GET as unknown as (
    path: string,
    init: { params: { query?: { country: string } } },
  ) => Promise<{ data?: unknown[]; response: Response }>;
  const { data, response } = await get(`/api/referentials/${name}/`, {
    params: country ? { query: { country } } : {},
  });
  if (!data) throw new Error(`Référentiel ${name} indisponible (${response.status})`);
  return data;
}

function fetchReferential(name: ReferentialName, country?: string): Promise<unknown[]> {
  const key = keyOf(name, country);
  let request = requests.get(key);
  if (!request) {
    request = load(name, country).catch((error: unknown) => {
      requests.delete(key);
      throw error;
    });
    requests.set(key, request);
  }
  return request;
}

/** Vide le cache des référentiels (tests). */
export function resetReferentials(): void {
  requests.clear();
}

type Result<N extends ReferentialName> = {
  items: Referentials[N][] | undefined;
  status: ReferentialStatus;
  retry: () => void;
};

/**
 * Lit un référentiel côté navigateur. `localities` attend un pays (`country`) : sans lui, le hook reste `idle`.
 * Pensé pour `ReferentialSelect` (états chargement et erreur, bouton « Réessayer »).
 */
export function useReferential<N extends ReferentialName>(name: N, options: { country?: string } = {}): Result<N> {
  const { country } = options;
  const waiting = name === "localities" && !country;
  const [attempt, setAttempt] = useState(0);
  const key = `${keyOf(name, country)}#${attempt}`;
  const [state, setState] = useState<{ key: string; items?: unknown[]; failed?: boolean }>({ key: "" });

  useEffect(() => {
    if (waiting) return;
    let current = true;
    fetchReferential(name, country).then(
      (items) => current && setState({ key, items }),
      () => current && setState({ key, failed: true }),
    );
    return () => {
      current = false;
    };
  }, [name, country, key, waiting]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  if (waiting) return { items: undefined, status: "idle", retry };
  if (state.key !== key) return { items: undefined, status: "loading", retry };
  if (state.failed) return { items: undefined, status: "error", retry };
  return { items: state.items as Referentials[N][], status: "ready", retry };
}
