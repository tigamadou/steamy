"use client";

import { useEffect, useState } from "react";

import { Toast } from "@/components/ds/Toast";

import { UNLOCKED_PARAM } from "./types";

/**
 * WC06a après un Kit Code valide (WA01) : toast « Parcours débloqué », fermable. Le paramètre de l'URL est retiré
 * aussitôt, pour qu'un rechargement ou un retour arrière ne le réaffiche pas.
 */
export function UnlockedToast() {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete(UNLOCKED_PARAM);
    window.history.replaceState(window.history.state, "", url);
  }, []);
  if (!open) return null;
  return <Toast title="Parcours débloqué 🎉 Bonne aventure !" onClose={() => setOpen(false)} />;
}
