import type { ElementRendererCtor } from "./types.js";
// add the registry to the global object
declare const globalThis: {
  [REGISTRY_KEY]: _ElementRendererRegistry;
};
declare const HTMLElement: { prototype: unknown };

const REGISTRY_KEY: unique symbol = Symbol.for("ElementRendererRegistry");

interface Element {
  prototype: unknown;
}

class _ElementRendererRegistry {
  private renderers = new Map<Element["prototype"], ElementRendererCtor>();
  /**
   * Renderers that select the elements they serve themselves, through Lit's
   * static `matchesClass` hook, rather than being registered against a
   * specific element class.
   *
   * This is how a whole *family* of elements is supported with one
   * registration — `use(LitElementRenderer)` makes every LitElement in the app
   * server-renderable — and it is what keeps this registry from privileging
   * any one component framework.
   */
  private matchers: ElementRendererCtor[] = [];

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

  /**
   * Registers a renderer that claims elements via Lit's static `matchesClass`.
   *
   * ```ts
   * import { LitElementRenderer } from "@lit-labs/ssr/lib/lit-element-renderer.js";
   *
   * ElementRendererRegistry.use(LitElementRenderer);
   * ```
   *
   * Explicit `set()` registrations win over these, so an app can still
   * override the renderer for one specific element.
   */
  use(renderer: ElementRendererCtor) {
    if (!this.matchers.includes(renderer)) {
      this.matchers.push(renderer);
    }
  }

  get(
    elementClass: Element,
    tagName = "",
    attributes: Map<string, string> = new Map(),
  ): ElementRendererCtor | null {
    let targetPrototype = elementClass.prototype;
    do {
      if (this.renderers.has(targetPrototype)) {
        return this.renderers.get(targetPrototype) ?? null;
      }
    } while (
      (targetPrototype = Object.getPrototypeOf(targetPrototype)) &&
      targetPrototype !== HTMLElement.prototype
    );

    // Fall back to renderers that select their own elements. Same protocol
    // Lit's own `getElementRenderer` uses, so a renderer written for Lit's
    // pipeline works here unchanged.
    for (const renderer of this.matchers) {
      const matchesClass = (
        renderer as unknown as {
          matchesClass?: (
            ceClass: Element,
            tagName: string,
            attributes: Map<string, string>,
          ) => boolean;
        }
      ).matchesClass;
      if (matchesClass?.call(renderer, elementClass, tagName, attributes)) {
        return renderer;
      }
    }
    return null;
  }

  has(elementClass: Element): boolean {
    return this.get(elementClass) !== null;
  }

  getAll() {
    return [...this.renderers.values(), ...this.matchers];
  }
}

// Initialize the registry if it doesn't exist
if (!globalThis[REGISTRY_KEY]) {
  globalThis[REGISTRY_KEY] = new _ElementRendererRegistry();
}

// Export a convenience accessor
export const ElementRendererRegistry = globalThis[REGISTRY_KEY];

// Export a factory for creating isolated registry instances, e.g. for tests
// that need a fresh registry without mutating the shared global one.
export function createElementRendererRegistry() {
  return new _ElementRendererRegistry();
}
