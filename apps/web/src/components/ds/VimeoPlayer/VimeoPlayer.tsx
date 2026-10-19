"use client";

import dynamic from "next/dynamic";
import { useState, type CSSProperties, type ReactNode } from "react";

import { cx } from "@/lib/cx";

import { Icon } from "../Icon";
import { vimeoSrc } from "./vimeo";

// Lecteur chargé seulement après l'intention de lecture : ni iframe ni script Vimeo avant le clic (ADR 0004, point 4).
const VimeoFrame = dynamic(() => import("./VimeoFrame"), {
  ssr: false,
  loading: () => (
    <span role="status" className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
      Chargement de la vidéo…
    </span>
  ),
});

export type VimeoPlayerProps = {
  /** Identifiant numérique de la vidéo, fourni par l'API. */
  vimeoId: string;
  /** Hachage d'une vidéo non listée (paramètre `h`). */
  vimeoHash?: string;
  /** Titre accessible de la vidéo (iframe et vignette). */
  title: string;
  /** Secondes réellement lues depuis le dernier appel (toutes les 30 s, à la pause, à la fin, en arrière-plan). */
  onProgress?: (seconds: number) => void;
  /** Libellé du bouton de la vignette (« Lire la bande-annonce »). */
  playLabel?: string;
  /** Visuel de la vignette, hébergé chez nous (emoji, image) ; jamais une vignette Vimeo. */
  poster?: ReactNode;
  /** Couleur de fond de la vignette. */
  color?: string;
  className?: string;
};

/**
 * Lecteur Vimeo de Steamy (LOT-3 §6) : vignette cliquable, puis iframe `player.vimeo.com` en 16:9. Une vidéo
 * illisible (identifiant invalide, domaine refusé, vidéo retirée) affiche « La vidéo ne peut pas être lue ».
 */
export function VimeoPlayer({
  vimeoId,
  vimeoHash,
  title,
  onProgress,
  playLabel = "Lire la vidéo",
  poster,
  color = "var(--ink-900)",
  className,
}: VimeoPlayerProps) {
  const src = vimeoSrc(vimeoId, vimeoHash);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(!src);

  return (
    <div
      className={cx("relative aspect-video w-full overflow-hidden rounded-[16px] bg-(--player-color)", className)}
      style={{ "--player-color": color } as CSSProperties}
    >
      {failed ? (
        <p
          role="alert"
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-ink-900 p-4 text-center text-sm font-bold text-white"
        >
          <Icon name="video" size={24} />
          La vidéo ne peut pas être lue.
        </p>
      ) : playing ? (
        <VimeoFrame src={src!} title={title} onProgress={onProgress} onError={() => setFailed(true)} />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`${playLabel} : ${title}`}
          className="group absolute inset-0 flex cursor-pointer items-center justify-center focus-visible:outline-3 focus-visible:-outline-offset-4 focus-visible:outline-white"
        >
          {poster && (
            <span aria-hidden className="text-[64px] drop-shadow-md">
              {poster}
            </span>
          )}
          <span
            aria-hidden
            className="absolute top-1/2 left-1/2 flex size-16 -translate-1/2 items-center justify-center rounded-pill bg-white/95 pl-1 text-ink-900 shadow-pop-md transition-transform group-hover:scale-105 motion-reduce:transition-none"
          >
            <Icon name="play" size={26} strokeWidth={2.5} />
          </span>
        </button>
      )}
    </div>
  );
}
