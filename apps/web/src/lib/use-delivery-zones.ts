"use client";

import type { Schemas } from "@steamy/api-client";
import { useCallback, useEffect, useState } from "react";

import type { AddressOptions } from "@/components/ds/AddressForm";
import { getBrowserApi } from "@/lib/api-browser";

type Zone = Schemas["DeliveryZone"];

/** Zone de livraison pour `AddressForm` (valeur : son `id`), libellée par son nom et son délai annoncé (D38). */
export function zoneOption(zone: Zone) {
  return { id: zone.id, code: String(zone.id), label: `${zone.name} (${zone.delayLabel})` };
}

/**
 * Zones de livraison actives d'un pays (`GET shop/delivery-zones/?country=`, D38), pour la liste « Ville ou zone »
 * d'`AddressForm` : chargement, erreur avec « Réessayer », prêtes. Sans pays, la liste est vide.
 */
export function useDeliveryZones(country: string): AddressOptions {
  const [attempt, setAttempt] = useState(0);
  const key = `${country}#${attempt}`;
  const [state, setState] = useState<{ key: string; items?: Zone[]; failed?: boolean }>({ key: "" });

  useEffect(() => {
    if (!country) return;
    let current = true;
    getBrowserApi()
      .then((api) => api.GET("/api/shop/delivery-zones/", { params: { query: { country } } }))
      .then(({ data }) => {
        if (!data) throw new Error("Zones de livraison indisponibles");
        if (current) setState({ key, items: data });
      })
      .catch(() => current && setState({ key, failed: true }));
    return () => {
      current = false;
    };
  }, [country, key]);

  const onRetry = useCallback(() => setAttempt((n) => n + 1), []);

  if (!country) return { items: [], status: "ready", onRetry };
  if (state.key !== key) return { items: undefined, status: "loading", onRetry };
  if (state.failed) return { items: undefined, status: "error", onRetry };
  return { items: state.items?.map(zoneOption), status: "ready", onRetry };
}
