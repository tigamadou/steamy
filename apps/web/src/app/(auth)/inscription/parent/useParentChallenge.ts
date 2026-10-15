"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import type { OtpChallenge } from "@/components/auth/OtpForm";
import { readFlow, writeFlow } from "@/lib/auth/flow-storage";

const noSubscription = () => () => {};
// Lecture mémorisée : `useSyncExternalStore` exige la même référence tant que la valeur ne change pas
let cache: { raw: string | null; value: OtpChallenge | null } = { raw: null, value: null };
function snapshot(): OtpChallenge | null {
  const value = readFlow<OtpChallenge>("parentChallenge");
  const raw = value ? JSON.stringify(value) : null;
  if (raw !== cache.raw) cache = { raw, value };
  return cache.value;
}

/**
 * Défi OTP de l'inscription parent, gardé dans l'onglet de WP01 à WP03. Sans défi (accès direct, autre onglet),
 * retour à WP01. `undefined` pendant le rendu serveur, `null` quand il manque.
 */
export function useParentChallenge(): [OtpChallenge | null | undefined, (challenge: OtpChallenge) => void] {
  const router = useRouter();
  const stored = useSyncExternalStore(noSubscription, snapshot, () => undefined);
  const [updated, setUpdated] = useState<OtpChallenge>();
  const challenge = updated ?? stored;

  useEffect(() => {
    if (challenge === null) router.replace("/inscription/parent");
  }, [challenge, router]);

  const update = useCallback((next: OtpChallenge) => {
    writeFlow("parentChallenge", next);
    setUpdated(next);
  }, []);

  return [challenge, update];
}
