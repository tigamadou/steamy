// Outils du lecteur Vimeo (ADR 0004) : URL d'intégration et cumul des secondes réellement lues.

const VIMEO_ID = /^\d+$/;
const VIMEO_HASH = /^[A-Za-z0-9]+$/;

/**
 * URL du lecteur intégré : `h` (hachage d'une vidéo non listée) suit immédiatement l'identifiant, `dnt=1` limite les
 * traces. `null` si l'identifiant ou le hachage ne sont pas valides (la vignette affiche alors le repli).
 */
export function vimeoSrc(vimeoId: string, vimeoHash?: string): string | null {
  if (!VIMEO_ID.test(vimeoId) || (vimeoHash && !VIMEO_HASH.test(vimeoHash))) return null;
  const params = vimeoHash ? `h=${vimeoHash}&dnt=1` : "dnt=1";
  return `https://player.vimeo.com/video/${vimeoId}?${params}`;
}

/** Écart maximal entre deux `timeupdate` compté comme de la lecture (au-delà : un saut dans la vidéo). */
export const MAX_TICK_SECONDS = 2;
/** Envoi groupé : toutes les 30 s de lecture (ADR 0004, point 7). */
export const FLUSH_EVERY_SECONDS = 30;

/**
 * Cumul des secondes lues (`timeupdate`), sauts exclus, remis à zéro à chaque envoi. `report` reçoit des secondes
 * entières ; le reste est gardé pour l'envoi suivant.
 */
export function createProgressTracker(report: (seconds: number) => void) {
  let last: number | null = null;
  let pending = 0;

  const flush = () => {
    const seconds = Math.floor(pending);
    if (seconds <= 0) return;
    pending -= seconds;
    report(seconds);
  };

  return {
    /** Position de lecture reçue du lecteur. */
    tick(position: number) {
      const delta = last === null ? 0 : position - last;
      last = position;
      if (delta > 0 && delta <= MAX_TICK_SECONDS) {
        pending += delta;
        if (pending >= FLUSH_EVERY_SECONDS) flush();
      }
    },
    /** Pause, fin, passage en arrière-plan : la position suivante repart sans compter l'écart. */
    pause() {
      last = null;
      flush();
    },
    flush,
  };
}
