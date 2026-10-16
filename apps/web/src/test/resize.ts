// jsdom n'implémente pas ResizeObserver : substitut installé par setup.ts, déclenché à la main dans les tests.
const callbacks = new Set<() => void>();
/** Éléments observés, pour vérifier qu'un composant suit bien le contenu qu'il mesure. */
export const observed = new Set<Element>();

export class ResizeObserverStub {
  private readonly callback: () => void;

  constructor(callback: () => void) {
    this.callback = callback;
  }

  observe(target: Element) {
    callbacks.add(this.callback);
    observed.add(target);
  }

  disconnect() {
    callbacks.delete(this.callback);
  }

  unobserve(target: Element) {
    observed.delete(target);
  }
}

/** Simule un redimensionnement : rappelle tous les observateurs actifs. */
export function triggerResize() {
  callbacks.forEach((callback) => callback());
}
