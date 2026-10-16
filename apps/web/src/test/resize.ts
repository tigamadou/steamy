// jsdom n'implémente pas ResizeObserver : substitut installé par setup.ts, déclenché à la main dans les tests.
const callbacks = new Set<() => void>();

export class ResizeObserverStub {
  private readonly callback: () => void;

  constructor(callback: () => void) {
    this.callback = callback;
  }

  observe() {
    callbacks.add(this.callback);
  }

  disconnect() {
    callbacks.delete(this.callback);
  }

  unobserve() {}
}

/** Simule un redimensionnement : rappelle tous les observateurs actifs. */
export function triggerResize() {
  callbacks.forEach((callback) => callback());
}
