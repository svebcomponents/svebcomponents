import { hydrate, unmount, type Component } from "svelte";

import {
  attributeValueToPropValue,
  propValueToAttributeValue,
  type SvelteCustomElementPropDefinition,
} from "../shared/propConversion.js";

/**
 * The `$$c` facade svelte's generated element class interacts with. Svelte
 * only ever calls `$set` (attribute/property changes), `$on` (event
 * plumbing) and `$destroy` (disconnect) on it.
 */
interface ComponentFacade {
  $set: (props: Record<string, unknown>) => void;
  $on: (type: string, callback: EventListener) => () => void;
  $destroy: () => void;
}

/**
 * The contract of svelte's compiler-generated custom element class
 * (`SvelteElement` in svelte/internal). These are the same internals the SSR
 * renderer already relies on (see svelteCustomElementRenderer.ts).
 */
interface SvelteGeneratedElement extends HTMLElement {
  /** the svelte component constructor */
  $$ctor: unknown;
  /** slot names the component declares */
  $$s: string[];
  /** component props data */
  $$d: Record<string, unknown>;
  /** prop definition metadata */
  $$p_d: Record<string, SvelteCustomElementPropDefinition>;
  /** the component facade (created on connect) */
  $$c: ComponentFacade | undefined;
  /** whether the element is currently connected */
  $$cn: boolean;
  /** re-entrancy guard while reflecting props to attributes */
  $$r: boolean;
  /** teardown for the attribute-reflection effect */
  $$me: () => void;
  /** listeners registered before the component existed */
  $$l: Record<string, EventListener[]>;
  /** listener unsubscribe functions */
  $$l_u: Map<EventListener, () => void>;
  connectedCallback?(): Promise<void> | void;
}

type SvelteGeneratedElementConstructor = new () => SvelteGeneratedElement;

/** maps an observed attribute name back to its prop name (svelte's `$$g_p`) */
const attributeToPropName = (
  attributeName: string,
  propDefinitions: Record<string, SvelteCustomElementPropDefinition>,
): string =>
  Object.keys(propDefinitions).find(
    (key) =>
      propDefinitions[key]?.attribute === attributeName ||
      (!propDefinitions[key]?.attribute && key.toLowerCase() === attributeName),
  ) ?? attributeName;

/**
 * Extends svelte's compiler-generated custom element class (via the official
 * `customElement.extend` option) so that a declaratively server-rendered
 * shadow root is *hydrated* instead of being wiped and re-rendered.
 *
 * Design constraints this deliberately honors:
 * - only public svelte APIs (`hydrate`, `unmount`) and the same `$$`
 *   element contract the SSR renderer already depends on
 * - anything non-hydratable (no declarative shadow root, slotted components,
 *   reconnection after teardown) falls back to `super.connectedCallback()`,
 *   i.e. svelte's untouched mount path
 * - svelte's own `hydrate()` recovers from mismatches by re-mounting, so a
 *   failed hydration degrades to exactly the previous behavior
 *
 * The client-compiled HydrationHost is passed in (auto-options injects both
 * imports into the component) instead of being imported here: importing the
 * .svelte from this module would let auto-options re-process the host and
 * create a circular import back into this module.
 */
interface HydrationHostExports {
  setProps: (next: Record<string, unknown>) => void;
}

export const hydratable = <T extends CustomElementConstructor>(
  ElementClass: T,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- host props are internal plumbing
  HydrationHost: Component<any, HydrationHostExports>,
): T => {
  const Class = ElementClass as unknown as SvelteGeneratedElementConstructor;

  const HydratableElement = class extends Class {
    // Both properties are assigned from attachShadow, which SvelteElement's
    // constructor calls via `super()` — *before* subclass field initializers
    // (or native #private field installation) run. They must therefore be
    // plain, initializer-less `declare`d properties: a class field would
    // either throw (native #private) or be reset to its initializer value
    // right after `super()` returns.
    /** the declarative shadow root claimed before svelte could clear it */
    declare private $$svebClaimedSsrShadowRoot: ShadowRoot | undefined;
    /** set once this element has client-rendered (hydrated or mounted) */
    declare private $$svebHasClientRendered: boolean | undefined;

    override attachShadow(init: ShadowRootInit): ShadowRoot {
      // SvelteElement's constructor calls `this.attachShadow(...)`; per spec
      // that would clear a declarative shadow root's children. Since this is
      // a prototype method it dispatches here even during the super
      // constructor, letting us claim the server-rendered root intact.
      const existing = this.shadowRoot;
      if (existing && existing.mode === init.mode) {
        this.$$svebClaimedSsrShadowRoot = existing;
        return existing;
      }
      return super.attachShadow(init);
    }

    override async connectedCallback(): Promise<void> {
      const ssrRoot = this.$$svebClaimedSsrShadowRoot;
      const canHydrate =
        ssrRoot !== undefined &&
        ssrRoot.childNodes.length > 0 &&
        !this.$$svebHasClientRendered &&
        !this.$$c &&
        // slotted components need hydration-aware slot handling we don't
        // provide yet — fall back to svelte's mount path for them
        this.$$s.length === 0;

      if (!canHydrate) {
        if (
          ssrRoot !== undefined &&
          ssrRoot.childNodes.length > 0 &&
          !this.$$svebHasClientRendered &&
          !this.$$c
        ) {
          // non-hydratable SSR content: clear it so svelte's mount path
          // doesn't render *after* the server content
          ssrRoot.replaceChildren();
        }
        return super.connectedCallback?.();
      }

      // From here on this mirrors SvelteElement.connectedCallback, minus slot
      // creation (excluded above) and with `hydrate` instead of mount.
      this.$$cn = true;
      // parity with svelte: give light-DOM children a tick to settle
      await Promise.resolve();
      if (!this.$$cn || this.$$c) {
        return;
      }

      // port host attributes to props
      for (const attribute of this.attributes) {
        const name = attributeToPropName(attribute.name, this.$$p_d);
        if (!(name in this.$$d)) {
          this.$$d[name] = this.$$p_d[name]
            ? attributeValueToPropValue(attribute.value, this.$$p_d[name])
            : attribute.value;
        }
      }
      // port properties set programmatically before the element upgraded
      for (const key in this.$$p_d) {
        const preUpgradeValue = (this as Record<string, unknown>)[key];
        if (!(key in this.$$d) && preUpgradeValue !== undefined) {
          this.$$d[key] = preUpgradeValue;
          delete (this as Record<string, unknown>)[key];
        }
      }

      const instance = hydrate(HydrationHost, {
        target: ssrRoot,
        props: {
          __component: this.$$ctor,
          __host: this,
          __propDefinitions: this.$$p_d,
          __initialProps: { ...this.$$d },
        },
      });
      this.$$svebHasClientRendered = true;
      // attribute reflection runs inside HydrationHost's $effect and is torn
      // down by unmount, so there is no separate reflection root to clean up
      this.$$me = () => {};
      this.$$c = {
        $set: (props) => {
          instance.setProps(props);
        },
        // Legacy `createEventDispatcher` events are not forwarded through the
        // hydration host (yet). Events dispatched via `$host()` bubble
        // natively and are unaffected.
        $on: () => () => {},
        $destroy: () => {
          unmount(instance);
        },
      };
      // wire listeners that were registered before the component existed
      for (const type in this.$$l) {
        for (const listener of this.$$l[type] ?? []) {
          const unsubscribe = this.$$c.$on(type, listener);
          this.$$l_u.set(listener, unsubscribe);
        }
      }
    }

    /**
     * Reflects a prop value back to a host attribute. Called from
     * HydrationHost's reflection $effect; conversion and the `$$r`
     * re-entrancy guard (which stops attributeChangedCallback from looping)
     * live here so the host component stays framework-pure.
     */
    $$svebReflect(
      prop: string,
      value: unknown,
      propDefinition: SvelteCustomElementPropDefinition,
    ): void {
      this.$$r = true;
      this.$$d[prop] = value;
      const attributeName = propDefinition.attribute ?? prop.toLowerCase();
      const attributeValue = propValueToAttributeValue(value, propDefinition);
      if (attributeValue == null) {
        this.removeAttribute(attributeName);
      } else if (this.getAttribute(attributeName) !== attributeValue) {
        this.setAttribute(attributeName, attributeValue);
      }
      this.$$r = false;
    }
  };

  return HydratableElement as unknown as T;
};
