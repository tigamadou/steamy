"use client";

import { VimeoPlayer } from "@/components/ds/VimeoPlayer";
import { getBrowserApi } from "@/lib/api-browser";

export type LessonVideoProps = {
  vimeoId: string;
  vimeoHash: string | null;
  title: string;
  /** Mission dont le visionnage alimente le temps d'apprentissage (`learning/activity/`, ADR 0004 §7). */
  missionId?: number;
};

/**
 * Envoie les secondes réellement lues d'une mission (`POST learning/activity/`), en `keepalive` pour survivre au
 * départ de la page. Un échec est sans effet sur la mission : le temps d'apprentissage est indicatif.
 */
export async function reportActivity(missionId: number, seconds: number): Promise<void> {
  try {
    const api = await getBrowserApi();
    await api.POST("/api/learning/activity/", { body: { missionId, seconds }, keepalive: true });
  } catch {
    // Réseau coupé : ces secondes ne sont pas comptées
  }
}

// Vidéo d'une mission (WJ03, suivi du visionnage) ou d'une intro de niveau (WJ02), sur le `VimeoPlayer` du DS.
export function LessonVideo({ vimeoId, vimeoHash, title, missionId }: LessonVideoProps) {
  return (
    <VimeoPlayer
      vimeoId={vimeoId}
      vimeoHash={vimeoHash ?? undefined}
      title={title}
      poster="🎬"
      onProgress={missionId === undefined ? undefined : (seconds) => void reportActivity(missionId, seconds)}
    />
  );
}
