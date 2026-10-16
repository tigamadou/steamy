"use client";

import Player from "@vimeo/player";
import { useEffect, useRef } from "react";

import { createProgressTracker } from "./vimeo";

export type VimeoFrameProps = {
  src: string;
  title: string;
  onProgress?: (seconds: number) => void;
  onError: () => void;
};

const EVENTS = ["timeupdate", "pause", "ended", "error"] as const;

/**
 * Lecteur monté après le clic sur la vignette (chargé par `next/dynamic`, sans rendu serveur) : l'iframe Vimeo,
 * rendue par React, et le SDK `@vimeo/player`, empaqueté avec l'application, branché dessus pour les événements.
 * Au démontage, seuls les écouteurs sont retirés : `destroy()` supprimerait du DOM l'iframe que React gère (perte du
 * lecteur en StrictMode). Un changement de `src` remonte une nouvelle iframe (`key`).
 */
export default function VimeoFrame(props: VimeoFrameProps) {
  return <Frame key={props.src} {...props} />;
}

function Frame({ src, title, onProgress, onError }: VimeoFrameProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  // Rappels les plus récents, sans rebrancher le lecteur à chaque rendu
  const callbacks = useRef({ onProgress, onError });
  useEffect(() => {
    callbacks.current = { onProgress, onError };
  });

  useEffect(() => {
    // Le SDK réutilise l'instance déjà attachée à cette iframe (remontage en StrictMode)
    const player = new Player(frame.current!);
    const tracker = createProgressTracker((seconds) => callbacks.current.onProgress?.(seconds));
    let active = true;
    const fail = () => {
      if (active) callbacks.current.onError();
    };
    player.on("timeupdate", (data: { seconds: number }) => tracker.tick(data.seconds));
    player.on("pause", () => tracker.pause());
    player.on("ended", () => tracker.pause());
    player.on("error", fail);
    player.ready().catch(fail);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") tracker.pause();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisibility);
      tracker.pause();
      for (const event of EVENTS) player.off(event);
    };
  }, []);

  return (
    <iframe
      ref={frame}
      src={src}
      title={title}
      allow="fullscreen; picture-in-picture"
      allowFullScreen
      className="absolute inset-0 size-full border-0"
    />
  );
}
