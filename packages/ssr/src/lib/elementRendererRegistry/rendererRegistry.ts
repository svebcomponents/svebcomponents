import type { ElementRendererCtor } from "./types.js";
// add the registry to the global object
declare const globalThis: {
  [REGISTRY_KEY]: _ElementRendererRegistry;
};
declare const HTMLElement: any;

const REGISTRY_KEY: unique symbol = Symbol.for("ElementRendererRegistry");

interface Element {
  prototype: any;
}

class _ElementRendererRegistry {
  private renderers = new Map<Element["prototype"], ElementRendererCtor>();

  set(elementBaseClass: Element, renderer: ElementRendererCtor) {
    this.renderers.set(elementBaseClass.prototype, renderer);
  }

  get(elementClass: Element): ElementRendererCtor | null {
    let targetPrototype = elementClass.prototype;
    do {
      if (this.renderers.has(targetPrototype)) {
        return this.renderers.get(targetPrototype) ?? null;
      }
    } while (
      (targetPrototype = Object.getPrototypeOf(targetPrototype) !== HTMLElement)
    );
    return null;
  }

  has(elementClass: Element) {
    return this.renderers.has(elementClass);
  }

  getAll() {
    return Array.from(this.renderers.values());
  }
}

// Initialize the registry if it doesn't exist
if (!globalThis[REGISTRY_KEY]) {
  globalThis[REGISTRY_KEY] = new _ElementRendererRegistry();
}

// Export a convenience accessor
export const ElementRendererRegistry = globalThis[REGISTRY_KEY];
