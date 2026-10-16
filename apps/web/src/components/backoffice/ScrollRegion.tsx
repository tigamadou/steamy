"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { cx } from "@/lib/cx";

import { FOCUS } from "./styles";

export type ScrollRegionProps = {
  /** Identifiant de l'élément qui nomme la zone (le `<caption>` du tableau). */
  labelledBy: string;
  className?: string;
  children: ReactNode;
};

/**
 * Zone à défilement horizontal (tableaux sur mobile) : focalisable et nommée seulement quand son contenu déborde,
 * pour défiler au clavier (WCAG 2.1.1) sans ajouter d'arrêt de tabulation inutile sur grand écran.
 */
export function ScrollRegion({ labelledBy, className, children }: ScrollRegionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrollable, setScrollable] = useState(false);

  useEffect(() => {
    const node = ref.current as HTMLDivElement;
    const measure = () => setScrollable(node.scrollWidth > node.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      {...(scrollable ? { role: "region", "aria-labelledby": labelledBy, tabIndex: 0 } : {})}
      className={cx("overflow-x-auto", FOCUS, className)}
    >
      {children}
    </div>
  );
}
