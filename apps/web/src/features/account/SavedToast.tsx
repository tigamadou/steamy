"use client";

import { useState } from "react";

import { Toast } from "@/components/ds/Toast";

/** Confirmation d'un enregistrement (WD17, WD18), fermable ; remonter le composant (`key`) la réaffiche. */
export function SavedToast({ title }: { title: string }) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return <Toast title={title} onClose={() => setOpen(false)} />;
}
