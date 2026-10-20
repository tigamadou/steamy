"use client";

import { useEffect, useState } from "react";

import { Toast } from "@/components/ds/Toast";

/**
 * Confirmation d'un enregistrement (WD17, WD18, WD11), fermable ; remonter le composant (`key`) la réaffiche.
 * `clearParam` : paramètre de l'URL qui a demandé le toast (`?candidature=envoyee`), retiré de l'entrée d'historique
 * dès l'affichage pour qu'un retour arrière ou un rechargement ne le réaffiche pas. `history.replaceState` (que le
 * routeur de Next.js suit) plutôt que `router.replace` : ce dernier relirait la page serveur, qui démonterait le toast
 * aussitôt affiché.
 */
export function SavedToast({ title, clearParam }: { title: string; clearParam?: string }) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    if (!clearParam) return;
    const url = new URL(window.location.href);
    url.searchParams.delete(clearParam);
    window.history.replaceState(window.history.state, "", url);
  }, [clearParam]);
  if (!open) return null;
  return <Toast title={title} onClose={() => setOpen(false)} />;
}
