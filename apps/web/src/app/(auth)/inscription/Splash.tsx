"use client";

import { useEffect, useState } from "react";

import { Loader } from "@/components/ds/Loader";
import { Logo } from "@/components/ds/Logo";
import { Mascot } from "@/components/ds/Mascot";

const SEEN_KEY = "steamy:splash-vu";
const DURATION_MS = 1200;

/**
 * W01 · Splash d'entrée de `/inscription` (SPEC-ECRANS §2.4) : au plus 1,5 s, une fois par session d'onglet,
 * absent sous `prefers-reduced-motion`. Jamais bloquant : voile décoratif qui laisse passer clics et clavier.
 */
export function Splash() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let seen = true;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) !== null;
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      // Stockage indisponible (navigation privée stricte) : pas de splash
    }
    if (seen || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const show = window.setTimeout(() => setVisible(true), 0);
    const hide = window.setTimeout(() => setVisible(false), DURATION_MS);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, []);

  if (!visible) return null;
  return (
    <div
      aria-hidden
      data-testid="splash"
      className="pointer-events-none fixed inset-0 z-40 flex flex-col items-center justify-center gap-6 bg-linear-135 from-primary-500 to-primary-700 text-white"
    >
      <Mascot pose="wave" size={180} hue="var(--surface)" />
      <Logo variant="white" height={72} eager />
      <p className="text-lg font-bold">Apprends · Construis · Joue</p>
      <Loader label="Chargement…" className="text-white" />
    </div>
  );
}
