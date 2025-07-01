import type { ElementRendererCtor } from "./types.js";
// add the registry to the global object
declare const globalThis: {
  [REGISTRY_KEY]: _ElementRendererRegistry;
};
declare const HTMLElement: unknown;

const REGISTRY_KEY: unique symbol = Symbol.for("ElementRendererRegistry");

interface Element {
  prototype: unknown;
}

class _ElementRendererRegistry {
  private renderers = new Map<Element["prototype"], ElementRendererCtor>();

  set(elementBaseClass: Element | string, renderer: ElementRendererCtor) {
    if (typeof elementBaseClass === "string") {
      const retrievedElementBaseClass = customElements.get(elementBaseClass);
      if (!retrievedElementBaseClass) {
        throw new Error(
          `Could not access custom element constructor for tag: ${elementBaseClass}`,
        );
      }
      elementBaseClass = retrievedElementBaseClass;
    }
    // set the elementBaseClass's constructor as key for renderer
    this.renderers.set(elementBaseClass.prototype, renderer);
  }

  get(elementClass: Element): ElementRendererCtor | null {
    let targetPrototype = elementClass.prototype;
    do {
      if (this.renderers.has(targetPrototype)) {
        return this.renderers.get(targetPrototype) ?? null;
      }
    } while (
      (targetPrototype = Object.getPrototypeOf(targetPrototype)) &&
      targetPrototype !== HTMLElement
    );
    return null;
  }

  has(elementClass: Element): boolean {
    const targetPrototype = elementClass.prototype;
    if (this.renderers.has(targetPrototype)) {
      return true;
    }
    if (targetPrototype === HTMLElement || targetPrototype === undefined) {
      // not in the registry if null prototype or HTMLElement
      return false;
    }
    return this.has(Object.getPrototypeOf(targetPrototype));
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
