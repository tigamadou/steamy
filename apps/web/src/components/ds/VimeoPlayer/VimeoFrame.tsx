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

/**
 * Lecteur monté après le clic sur la vignette (chargé par `next/dynamic`, sans rendu serveur) : l'iframe Vimeo et
 * le SDK `@vimeo/player`, empaqueté avec l'application, pour les événements de lecture.
 */
export default function VimeoFrame({ src, title, onProgress, onError }: VimeoFrameProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  // Rappels les plus récents, sans recréer le lecteur à chaque rendu
  const callbacks = useRef({ onProgress, onError });
  useEffect(() => {
    callbacks.current = { onProgress, onError };
  });

  useEffect(() => {
    const player = new Player(frame.current!);
    const tracker = createProgressTracker((seconds) => callbacks.current.onProgress?.(seconds));
    const fail = () => callbacks.current.onError();
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
      document.removeEventListener("visibilitychange", onVisibility);
      tracker.pause();
      player.destroy().catch(() => {});
    };
  }, [src]);

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
